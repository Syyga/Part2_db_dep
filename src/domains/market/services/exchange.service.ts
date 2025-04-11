import { PrismaClient, Prisma } from "@prisma/client";
import { ExchangeOffer } from "../interfaces/exchange.interface";
import { CustomError } from "../../../utils/errors";
import { createNotification } from "../../notification/services/notificationService";
import { CreateExchangeOffer } from "../types/exchange.type";

const prisma = new PrismaClient();

/**
 * 교환제안 생성
 * @param body 교환 제안 정보
 * @param userId 현재 사용자 ID
 */
export const createExchangeOffer: CreateExchangeOffer = async (
  body,
  userId
) => {
  const { saleCardId, offeredUserCardId, content } = body;
  const offererId = userId; // 제시자 ID

  // 판매카드 조회
  const saleCard = await prisma.saleCard.findUnique({
    where: { id: saleCardId },
    select: {
      sellerId: true,
      photoCard: {
        select: {
          name: true,
          grade: true,
        },
      },
    },
  });
  // 판매카드가 없거나 판매중이 아닌 경우
  if (!saleCard) {
    throw new CustomError("판매카드를 찾을 수 없습니다.", 404);
  }
  const { sellerId, photoCard } = saleCard; // 판매자 ID, 판매 포토카드
  const { name: saleCardName, grade: saleCardGrade } = photoCard; // 판매카드의 포토카드 정보

  // 판매자가 제안자와 동일한 경우 에러 처리
  const isSelfOffer = sellerId === offererId;
  if (isSelfOffer) {
    throw new CustomError("자신의 카드에 교환 제안을 할 수 없습니다.", 403);
  }

  // 교환 제시자 닉네임 조회
  const offerer = await prisma.user.findUnique({
    where: { id: offererId },
    select: { nickname: true },
  });
  if (!offerer) {
    throw new CustomError("교환 제시자 정보를 찾을 수 없습니다.", 404);
  }
  const offererNickname = offerer.nickname; // 교환 제시자 닉네임

  // 제안카드 조회
  const offeredUserCard = await prisma.userPhotoCard.findUnique({
    where: { id: offeredUserCardId },
    select: { photoCardId: true, quantity: true },
  });
  if (!offeredUserCard) {
    throw new CustomError("제안한 카드를 찾을 수 없습니다.", 404);
  }
  const { photoCardId: offeredCardId, quantity } = offeredUserCard; // 제안카드 ID, 수량
  if (quantity < 1) {
    throw new CustomError("제안한 카드의 수량이 부족합니다.", 409);
  }
  // 제안카드의 포토카드 정보 조회
  const offeredPhotoCard = await prisma.photoCard.findUnique({
    where: { id: offeredCardId },
    select: { name: true, grade: true },
  });
  if (!offeredPhotoCard) {
    throw new CustomError(
      "제안한 카드의 포토카드 정보를 찾을 수 없습니다.",
      404
    );
  }
  const { name: offeredCardName, grade: offeredCardGrade } = offeredPhotoCard; // 제안카드의 포토카드 정보

  // 교환 제안 생성
  const exchangeOffer = await prisma.exchangeOffer.create({
    data: {
      saleCardId,
      offererId,
      userPhotoCardId: offeredUserCardId,
      status: "PENDING",
      content,
    },
  });

  // MarketOffer에 저장
  await prisma.marketOffer.create({
    data: {
      type: "EXCHANGE",
      ownerId: exchangeOffer.offererId,
      saleCardId: null,
      exchangeOfferId: exchangeOffer.id,
    },
  });

  // 알림 생성
  const salePhotoCardInfo = `[${saleCardGrade}|${saleCardName}]`; // 판매카드 정보
  const offeredPhotoCardInfo = `[${offeredCardGrade}|${offeredCardName}]`; // 제안카드 정보

  const offererMessage = `${salePhotoCardInfo}에 대한 교환제안이 등록되었습니다.`; // 제안자에게 알림
  const sellerMessage = `${offererNickname}님이 ${salePhotoCardInfo}에 대해 ${offeredPhotoCardInfo} 카드로 교환을 제안했습니다.`;

  await createNotification({ userId: offererId, message: offererMessage }); // 제안자 알림
  await createNotification({ userId: sellerId, message: sellerMessage }); // 판매자 알림

  return {
    message: "포토카드 제안이 완료되었습니다.",
    exchangeOffer,
  };
};

/**
 * 교환제안 취소/거절
 * @param id 교환제안 ID
 * @param userId 현재 사용자 ID
 */
export const failOffer = async (
  id: string,
  userId: string
): Promise<ExchangeOffer> => {
  // 교환 제안 조회
  const exchangeOffer = await prisma.exchangeOffer.findUnique({
    where: { id },
    include: {
      saleCard: {
        include: {
          photoCard: true,
          seller: true,
        },
      },
    },
  });

  if (!exchangeOffer) {
    throw new CustomError("교환제안을 찾을 수 없습니다.", 404);
  }

  // 권한 검증: 제안을 한 사람이거나 판매자만 거절/취소할 수 있음
  if (
    exchangeOffer.offererId !== userId &&
    exchangeOffer.saleCard.sellerId !== userId
  ) {
    throw new CustomError("교환 제안을 거절/취소할 권한이 없습니다.", 403);
  }

  // 제안자 정보 조회
  const offerer = await prisma.user.findUnique({
    where: { id: exchangeOffer.offererId },
  });
  if (!offerer) {
    throw new CustomError("교환 제안자 정보를 찾을 수 없습니다.", 404);
  }

  // 업데이트 전의 상태 저장
  const prevStatus = exchangeOffer.status;

  // 거절 또는 취소로 상태 업데이트
  const updatedOffer = await prisma.exchangeOffer.update({
    where: { id },
    data: { status: "FAILED" },
  });

  // 알림 생성
  if (prevStatus === "PENDING") {
    // 거절 알림
    if (exchangeOffer.saleCard.sellerId === userId) {
      // 판매자가 거절한 경우: offerer에게 알림
      await createNotification({
        userId: exchangeOffer.offererId,
        message: `[${exchangeOffer.saleCard.photoCard.grade} | ${exchangeOffer.saleCard.photoCard.name}]의 교환이 거절되었습니다.`,
      });
    } else {
      // offerer가 취소한 경우: seller에게 알림
      await createNotification({
        userId: exchangeOffer.saleCard.sellerId,
        message: `${offerer.nickname}님의 교환 제안이 취소되었습니다.`,
      });
    }
  } else if (prevStatus === "ACCEPTED") {
    // 이미 수락된 상태에서 품절 등의 이유로 실패한 경우
    await createNotification({
      userId: exchangeOffer.offererId,
      message: `[${exchangeOffer.saleCard.photoCard.grade} | ${exchangeOffer.saleCard.photoCard.name}]의 교환이 실패했습니다.`,
    });
  }

  return updatedOffer;
};

/**
 * 교환제안 승인
 *
 * @param id 교환제안 ID
 * @param userId 현재 사용자 ID
 *
 * seller : 판매 카드 소유자
 * offerer : 교환 제안자 (카드 미소유)
 * seller -> offerer : 판매 카드 제공
 * offerer -> seller : 교환 제안 카드 제공
 */
export const acceptOffer = async (
  id: string,
  userId: string
): Promise<ExchangeOffer> => {
  return prisma.$transaction(async (tx) => {
    // 1. 교환제안 조회
    const exchangeOffer = await tx.exchangeOffer.findUnique({
      where: { id },
      include: {
        saleCard: {
          include: {
            photoCard: true,
            seller: true,
          },
        },
      },
    });

    if (!exchangeOffer) {
      throw new CustomError("교환제안을 찾을 수 없습니다.", 404);
    }

    if (exchangeOffer.status !== "PENDING") {
      throw new CustomError("교환제안이 PENDING 상태가 아닙니다.", 400);
    }

    // 권한 검증: 판매자만 승인할 수 있음
    if (exchangeOffer.saleCard.sellerId !== userId) {
      throw new CustomError("교환 제안을 승인할 권한이 없습니다.", 403);
    }

    // 제안자(offerer) 정보 조회
    const offerer = await tx.user.findUnique({
      where: { id: exchangeOffer.offererId },
    });
    if (!offerer) {
      throw new CustomError("교환 제안자 정보를 찾을 수 없습니다.", 404);
    }

    // 2. 해당 saleCard 조회
    const saleCard = await tx.saleCard.findUnique({
      where: { id: exchangeOffer.saleCardId },
    });
    if (!saleCard) {
      throw new CustomError("판매 카드를 찾을 수 없습니다.", 404);
    }
    if (saleCard.status !== "ON_SALE") {
      throw new CustomError("판매 카드가 ON_SALE 상태가 아닙니다.", 400);
    }

    // 3. 교환 제안 카드 조회 (offerer가 제안한 카드)
    const offererCard = await tx.userPhotoCard.findUnique({
      where: { id: exchangeOffer.userPhotoCardId },
    });
    if (!offererCard) {
      throw new CustomError("교환 제안 카드를 찾을 수 없습니다.", 404);
    }
    if (offererCard.quantity < 1) {
      throw new CustomError("교환 제안 카드의 수량이 부족합니다.", 400);
    }

    // 교환 제안 카드의 포토카드 정보 조회
    const offeredPhotoCard = await tx.photoCard.findUnique({
      where: { id: offererCard.photoCardId },
    });
    if (!offeredPhotoCard) {
      throw new CustomError(
        "교환 제안 카드의 포토카드 정보를 찾을 수 없습니다.",
        404
      );
    }

    // 4. 판매 대상 카드를 seller의 인벤토리에서 차감
    // seller의 판매 카드에 락 설정
    const sellerSaleCardSQL = `
      SELECT * FROM "UserPhotoCard" 
      WHERE "ownerId" = '${saleCard.sellerId}' 
      AND "photoCardId" = '${saleCard.photoCardId}'
      FOR UPDATE
    `;
    await tx.$executeRaw(Prisma.raw(sellerSaleCardSQL));

    const sellerSaleCard = await tx.userPhotoCard.findFirst({
      where: {
        ownerId: saleCard.sellerId,
        photoCardId: saleCard.photoCardId,
      },
    });
    if (!sellerSaleCard) {
      throw new CustomError("판매 카드가 없습니다.", 404);
    }

    await tx.userPhotoCard.update({
      where: { id: sellerSaleCard.id },
      data: { quantity: sellerSaleCard.quantity - 1 },
    });

    // 5. 판매 대상 카드를 offerer 인벤토리에 추가
    // offerer의 판매 카드 락 설정
    const offererSaleCardSQL = `
      SELECT * FROM "UserPhotoCard" 
      WHERE "ownerId" = '${exchangeOffer.offererId}' 
      AND "photoCardId" = '${saleCard.photoCardId}'
      FOR UPDATE
    `;
    await tx.$executeRaw(Prisma.raw(offererSaleCardSQL));

    const offererSaleCard = await tx.userPhotoCard.findFirst({
      where: {
        ownerId: exchangeOffer.offererId,
        photoCardId: saleCard.photoCardId,
      },
    });
    // 이미 동일한 포토카드를 보유하고 있으면 수량 증가
    if (offererSaleCard) {
      await tx.userPhotoCard.update({
        where: { id: offererSaleCard.id },
        data: { quantity: offererSaleCard.quantity + 1 },
      });
    } else {
      // 카드가 없으면 생성
      await tx.userPhotoCard.create({
        data: {
          ownerId: exchangeOffer.offererId,
          photoCardId: saleCard.photoCardId,
          quantity: 1,
        },
      });
    }

    // 6. offerer가 제안한 카드를 offerer의 인벤토리에서 차감
    // offerer의 제안 카드에 락 설정
    const offererCardSQL = `
      SELECT * FROM "UserPhotoCard" 
      WHERE "id" = '${exchangeOffer.userPhotoCardId}' 
      FOR UPDATE
    `;
    await tx.$executeRaw(Prisma.raw(offererCardSQL));

    await tx.userPhotoCard.update({
      where: { id: exchangeOffer.userPhotoCardId },
      data: { quantity: offererCard.quantity - 1 },
    });

    // 7. offerer가 제안한 카드를 seller 인벤토리에 추가
    // seller의 제안 카드 락 설정
    const sellerOfferCardSQL = `
      SELECT * FROM "UserPhotoCard" 
      WHERE "ownerId" = '${saleCard.sellerId}' 
      AND "photoCardId" = '${offererCard.photoCardId}'
      FOR UPDATE
    `;
    await tx.$executeRaw(Prisma.raw(sellerOfferCardSQL));

    const sellerOfferCard = await tx.userPhotoCard.findFirst({
      where: {
        ownerId: saleCard.sellerId,
        photoCardId: offererCard.photoCardId,
      },
    });

    // 이미 동일한 포토카드를 보유하고 있으면 수량 증가
    if (sellerOfferCard) {
      await tx.userPhotoCard.update({
        where: { id: sellerOfferCard.id },
        data: { quantity: sellerOfferCard.quantity + 1 },
      });
    } else {
      // 카드가 없으면 생성
      await tx.userPhotoCard.create({
        data: {
          ownerId: saleCard.sellerId,
          photoCardId: offererCard.photoCardId,
          quantity: 1,
        },
      });
    }

    // 8. 교환제안 상태 업데이트
    // 교환제안에도 락 설정
    await tx.$executeRaw`SELECT * FROM "ExchangeOffer" WHERE id = ${id} FOR UPDATE`;

    const acceptedOffer = await tx.exchangeOffer.update({
      where: { id },
      data: { status: "ACCEPTED" },
    });

    // 9. 거래 내역 기록
    await tx.transactionLog.create({
      data: {
        transactionType: "EXCHANGE",
        saleCardId: saleCard.id,
        newOwnerId: exchangeOffer.offererId,
        oldOwnerId: saleCard.sellerId,
        quantity: 1,
        totalPrice: 0,
      },
    });

    // 10. saleCard 수량 업데이트, 수량이 0이면 SOLD_OUT 상태로 변경
    // saleCard에 락 설정
    await tx.$executeRaw`SELECT * FROM "SaleCard" WHERE id = ${saleCard.id} FOR UPDATE`;

    // TransactionLog에서 해당 saleCard의 총 거래 수량 조회
    const transactionLogs = await tx.transactionLog.findMany({
      where: { saleCardId: saleCard.id },
      select: { quantity: true },
    });

    // 총 거래된 수량 계산 (현재 거래는 이미 로그에 저장되어 있으므로 +1 필요 없음)
    const totalTransactedQuantity = transactionLogs.reduce(
      (total, log) => total + log.quantity,
      0
    );

    // 남은 수량 계산
    const remainingQuantity = Math.max(
      0,
      saleCard.quantity - totalTransactedQuantity
    );

    await tx.saleCard.update({
      where: { id: saleCard.id },
      data: {
        quantity: remainingQuantity,
        ...(remainingQuantity === 0 ? { status: "SOLD_OUT" } : {}),
      },
    });

    // 11. 알림 생성 - 판매자(seller)와 교환 제안자(offerer) 모두에게 알림 전송
    await createNotification({
      userId: saleCard.sellerId,
      message: `${offerer.nickname}님과의 교환이 성사되었습니다.`,
    });

    // offerer에게는 seller의 닉네임과 카드 이름을 포함한 메시지 전송
    await createNotification({
      userId: exchangeOffer.offererId,
      message: `${exchangeOffer.saleCard.seller.nickname}님과의 [${exchangeOffer.saleCard.photoCard.grade} | ${exchangeOffer.saleCard.photoCard.name}] 교환이 성사되었습니다.`,
    });

    return acceptedOffer as unknown as ExchangeOffer;
  });
};

const exchangeService = {
  createExchangeOffer,
  failOffer,
  acceptOffer,
};

export default exchangeService;
