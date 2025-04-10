import { UserPhotoCard } from "@prisma/client";
import { CustomError } from "../../../utils/errors";
import prisma from "../../../utils/prismaClient";
import { CreateMarketItem, PurchaseMarketItem } from "../types/market.type";

const createMarketItem: CreateMarketItem = async (body, userId) => {
  const { userPhotoCardId, quantity, price, exchangeOffer } = body;
  const { grade, genre, description } = exchangeOffer || {};

  // 판매할 카드가 존재하는지 확인
  const userPhotoCard = await prisma.userPhotoCard.findUnique({
    where: { id: userPhotoCardId },
  });
  if (!userPhotoCard || userPhotoCard.ownerId !== userId)
    throw new CustomError("Invalid user photo card", 400);

  // 이미 판매중인 카드인지 확인
  const onSaleCard = await prisma.saleCard.findFirst({
    where: { userPhotoCardId, status: "ON_SALE" },
  });
  if (onSaleCard) throw new CustomError("Already on sale", 400);

  // 판매할 카드의 수량이 충분한지 확인
  if (userPhotoCard.quantity < quantity)
    throw new CustomError("Not enough quantity", 400);

  // === 트랜잭션으로 묶기 ===
  const saleCard = await prisma.$transaction(async (tx) => {
    const saleCard = await tx.saleCard.create({
      data: {
        quantity,
        price,
        status: "ON_SALE",
        exchangeDescription: description || "",
        exchangeGrade: grade || "",
        exchangeGenre: genre || "",
        sellerId: userId,
        photoCardId: userPhotoCard.photoCardId,
        userPhotoCardId,
      },
      include: {
        photoCard: true,
        seller: {
          select: { nickname: true },
        },
      },
    });

    await tx.marketOffer.create({
      data: {
        type: "SALE",
        ownerId: userId,
        saleCardId: saleCard.id,
        exchangeOfferId: null,
      },
    });

    return saleCard;
  });

  // === 결과 리턴 ===
  return {
    saleCardId: saleCard.id,
    userPhotoCardId: userPhotoCard.id,
    status: saleCard.status,
    name: saleCard.photoCard.name,
    genre: saleCard.photoCard.genre,
    grade: saleCard.photoCard.grade,
    price: saleCard.price,
    image: saleCard.photoCard.imageUrl,
    remaining: saleCard.quantity,
    total: userPhotoCard.quantity,
    createdAt: saleCard.createdAt.toISOString(),
    updatedAt: saleCard.updatedAt.toISOString(),
    owner: {
      id: userId,
      nickname: saleCard.seller.nickname,
    },
    exchangeOffer: {
      description: saleCard.exchangeDescription,
      grade: saleCard.exchangeGrade,
      genre: saleCard.exchangeGenre,
    },
  };
};

const purchaseMarketItem: PurchaseMarketItem = async (body, userId) => {
  const { saleCardId, quantity } = body; // 판매 카드 ID와 구매 수량
  const customerId = userId; // 소비자 ID

  // 구매자 정보 조회
  const customer = await prisma.user.findUnique({
    where: { id: customerId }, // 구매자 ID로 조회
    select: {
      nickname: true, // 구매자 닉네임
    },
  });
  if (!customer)
    throw new CustomError("구매자 정보를 조회할 수 없습니다.", 404);
  const { nickname: customerNick } = customer; // 구매자 닉네임

  // 판매 포토카드 정보 조회
  const saleCard = await prisma.saleCard.findUnique({
    where: { id: saleCardId }, // 판매 카드 ID로 조회
    select: {
      quantity: true, // 포토카드 판매 수량 (saleCount)
      price: true, // 판매 포토카드 가격
      sellerId: true, // 판매자 ID
      status: true, // 판매 카드 상태
      photoCardId: true, // 포토카드 ID
      photoCard: {
        select: {
          name: true, // 포토카드 이름
          grade: true, // 포토카드 등급
        },
      },
    },
  });
  // 판매 포토카드 정보가 존재하는지 확인
  if (!saleCard) {
    throw new CustomError("판매 포토카드의 정보를 찾을 수 없습니다", 404);
  }
  const {
    photoCardId,
    sellerId,
    price,
    quantity: saleCount,
    status,
    photoCard,
  } = saleCard; // 판매 카드 정보
  const { name: cardName, grade } = photoCard; // 포토카드 정보
  const totalPrice = price * quantity; // 총 구매 가격
  let isSoldOut = saleCard.status === "SOLD_OUT"; // 품절 여부

  // 판매 카드 상태 확인
  if (isSoldOut) {
    throw new CustomError("판매 카드가 품절되었습니다", 409);
  }

  // 포토카드 구매 트랜잭션
  await prisma.$transaction(async (tx) => {
    // 1-1. 판매자 카드 락 (구매 트랜잭션과 교환 트랜잭션의 충돌 방지를 위해)
    const lockedSellerCard = await tx.$queryRaw<UserPhotoCard[]>`
      SELECT * FROM "UserPhotoCard"
      WHERE "photoCardId" = ${photoCardId} And "ownerId" = ${sellerId}
      FOR UPDATE
    `;
    // 1-2. 판매자의 포토카드가 존재하는지 확인
    if (!lockedSellerCard[0]) {
      throw new CustomError("판매자의 해당 포토카드를 찾을 수 없습니다", 404);
    }
    // 1-3. 판매자 포토카드 소유량이 판매량 보다 적을 경우 에러처리
    if (lockedSellerCard[0].quantity < quantity) {
      throw new CustomError("판매자의 포토카드 소유량이 부족합니다", 409);
    }

    // 2-1. 판매 카드의 총 판매 거래(판매, 교환) 조회
    const tradeCount = await tx.transactionLog.aggregate({
      where: { saleCardId },
      _sum: {
        quantity: true,
      },
    }); // 거래된 수량
    const stockCount = saleCount - (tradeCount._sum.quantity || 0); // 남은 재고 수량
    // 2-2. 재고 확인
    if (stockCount < quantity) {
      throw new CustomError("판매 카드의 재고가 부족합니다", 409);
    }
    if (stockCount === quantity) {
      // 재고량과 구매량이 같을 경우 품절 상태로 변경
      await tx.saleCard.update({
        where: { id: saleCardId },
        data: { status: "SOLD_OUT" }, // 판매 카드 상태 변경
      });
      isSoldOut = true; // 품절 상태로 변경
    }

    // 3-1. 구매자 포인트 락 (랜덤박스로 얻는 포인트와 동시성 막기 위해)
    const lockedCustomerPoint = await tx.$queryRaw`
      SELECT * FROM "Point"
      WHERE id = ${customerId}
      FOR UPDATE
    `;
    // 3-2. 구매자 포인트 감소
    const updatedCustomerPoint = await tx.point.update({
      where: { userId: customerId }, // 구매자 ID로 포인트 업데이트
      data: {
        points: { decrement: totalPrice }, // 총 구매 가격만큼 포인트 감소
      },
    });
    // 3-3. 구매자 포인트 부족 여부 확인 포함
    if (updatedCustomerPoint.points < 0) {
      throw new CustomError("구매자의 포인트가 부족합니다", 409);
    }
    // 3-4. 판매 완료 로그 추가 (구매자 포인트 부족까지 확인 후에는 검토사항 없으므로)
    const saleLog = await tx.transactionLog.create({
      data: {
        transactionType: "SALE",
        saleCardId,
        newOwnerId: customerId,
        oldOwnerId: sellerId,
        quantity,
        totalPrice,
      },
    });
    // 3-5. 구매자 포인트 감소 내역 추가
    await tx.pointHistory.create({
      data: {
        pointId: updatedCustomerPoint.id,
        amount: totalPrice, // 양수 값
        resourceType: "PURCHASE", // 구매로 인한 포인트 차감
        resourceId: saleLog.id,
      },
    });

    // 4-1. 판매자 포인트 락 (랜덤박스로 얻는 포인트와 동시성 막기 위해)
    const lockedSellerPoint = await tx.$queryRaw`
      SELECT * FROM "Point"
      WHERE id = ${sellerId}
      FOR UPDATE
    `;
    // 4-2. 판매자 포인트 증가
    const updatedSellerPoint = await tx.point.update({
      where: { userId: sellerId }, // 판매자 ID로 포인트 업데이트
      data: {
        points: { increment: totalPrice }, // 총 구매 가격만큼 포인트 증가
      },
    });
    // 4-3. 판매자 포인트 증가 내역 추가
    await tx.pointHistory.create({
      data: {
        pointId: updatedSellerPoint.id,
        amount: totalPrice, // 양수 값
        resourceType: "SALE", // 판매로 인한 포인트 증가
        resourceId: saleLog.id,
      },
    });

    // 5. 판매자 카드 소유량 업데이트
    await tx.userPhotoCard.update({
      where: {
        ownerId_photoCardId: {
          ownerId: sellerId,
          photoCardId,
        },
      },
      data: {
        quantity: { decrement: quantity },
      },
    });

    // 6-1. 구매자 카드 소유량 업데이트 (조회하여 리소스 없을 경우 새로 생성, 리소스 있을 경우 업데이트)
    const customerCard = await tx.userPhotoCard.findUnique({
      where: {
        ownerId_photoCardId: {
          ownerId: customerId,
          photoCardId,
        },
      },
    });

    // 6-2. 구매자가 구매한 카드가 없을 경우 새로 생성
    if (!customerCard) {
      await tx.userPhotoCard.create({
        data: {
          ownerId: customerId,
          photoCardId,
          quantity: 0, // 초기화 0
        },
      });
    }

    // 6-3. 생성후 또는 리소스 존재하는 경우 구매량 만큼 소유량 증가
    await tx.userPhotoCard.update({
      where: {
        ownerId_photoCardId: {
          ownerId: customerId,
          photoCardId,
        },
      },
      data: {
        quantity: { increment: quantity },
      },
    });
  });

  // 알림 트랜잭션 (구매자 판매자 닉네임 가져오기)
  await prisma.$transaction(async (tx) => {
    // 1. 판매자에게 알림 추가 (구매자님이 [saleCard]을 1장 구매했습니다.)
    await tx.notification.create({
      data: {
        userId: sellerId,
        message: `${customerNick}님이 [${grade}|${cardName}]을 ${quantity}장 구매했습니다.`,
      },
    });
    // 2. 구매자에게 알림 추가 (구매가 완료되었습니다.)
    await tx.notification.create({
      data: {
        userId: customerId,
        message: `[${grade}|${cardName}]을 ${quantity}장을 성공적으로 구매했습니다.`,
      },
    });

    // 3. 구매자에게 포토카드 추가 알림 (구매한 포토카드가 없을 경우)

    if (isSoldOut) {
      await tx.notification.create({
        data: {
          userId: sellerId,
          message: `[${grade}|${cardName}]이 품절 되었습니다.`,
        },
      });
    }
  });

  // 성공 메시지 리턴
  return {
    message: "포토카드 구매가 완료되었습니다.",
  };
};

const marketCuService = {
  createMarketItem,
  purchaseMarketItem,
};

export default marketCuService;
