import { CustomError } from "../../../utils/errors";
import prisma from "../../../utils/prismaClient";
import {
  CancelMarketItem,
  MarketItemResponse,
  UpdateMarketItem,
} from "../types/market.update.types";
import { createNotification } from "../../notification/services/notificationService";

// 응답 객체 생성을 위한 공통 함수
const createResponseObject = (
  saleCard: any,
  userId: string
): MarketItemResponse => {
  return {
    saleCardId: saleCard.id,
    userPhotoCardId: saleCard.userPhotoCardId,
    status: saleCard.status,
    name: saleCard.photoCard.name,
    genre: saleCard.photoCard.genre,
    grade: saleCard.photoCard.grade,
    price: saleCard.price,
    image: saleCard.photoCard.imageUrl,
    remaining: saleCard.quantity,
    total: saleCard.quantity,
    createdAt: saleCard.createdAt.toISOString(),
    updatedAt: saleCard.updatedAt.toISOString(),
    creator: {
      id: saleCard.photoCard.creator?.id || saleCard.photoCard.creatorId,
      nickname: saleCard.photoCard.creator?.nickname || "Unknown Creator",
    },
    exchangeOffer: {
      description: saleCard.exchangeDescription,
      grade: saleCard.exchangeGrade,
      genre: saleCard.exchangeGenre,
    },
  };
};

// 판매 중인 카드의 유효성 검증을 위한 공통 함수
const validateSaleCard = async (saleCardId: string, userId: string) => {
  const saleCard = await prisma.saleCard.findUnique({
    where: { id: saleCardId },
    include: {
      photoCard: {
        include: {
          creator: true,
        },
      },
      seller: { select: { nickname: true } },
      userPhotoCard: true,
    },
  });

  if (!saleCard) throw new CustomError("Sale card not found", 404);
  if (saleCard.sellerId !== userId)
    throw new CustomError("Not authorized", 403);
  if (saleCard.status !== "ON_SALE")
    throw new CustomError("Card is not on sale", 400);

  return saleCard;
};

// 판매 등록한 포토카드 수정 (기존 판매 취소 후 새로 등록)
const updateMarketItem: UpdateMarketItem = async (saleCardId, body, userId) => {
  const { quantity, price, exchangeOffer } = body;
  const { grade, genre, description } = exchangeOffer || {};

  // 판매 중인 카드 검증
  const saleCard = await validateSaleCard(saleCardId, userId);

  // 수정할 카드의 수량이 충분한지 확인
  if (quantity !== undefined && saleCard.userPhotoCard.quantity < quantity)
    throw new CustomError("Not enough quantity", 400);

  // 판매 카드 정보 미리 저장
  const photoCardInfo = {
    grade: saleCard.photoCard.grade,
    name: saleCard.photoCard.name,
  };

  // 기존 교환 제안 조회
  const pendingOffers = await prisma.exchangeOffer.findMany({
    where: {
      saleCardId,
      status: "PENDING",
    },
    select: {
      id: true,
      offererId: true,
      marketOffer: true,
    },
  });

  // 트랜잭션으로 모든 작업 처리
  const result = await prisma.$transaction(async (tx) => {
    // 1. 새로운 판매 카드 생성
    const newSaleCard = await tx.saleCard.create({
      data: {
        quantity: quantity !== undefined ? quantity : saleCard.quantity,
        price: price !== undefined ? price : saleCard.price,
        status: "ON_SALE",
        exchangeDescription: exchangeOffer
          ? description || ""
          : saleCard.exchangeDescription,
        exchangeGrade: exchangeOffer ? grade || "" : saleCard.exchangeGrade,
        exchangeGenre: exchangeOffer ? genre || "" : saleCard.exchangeGenre,
        sellerId: userId,
        photoCardId: saleCard.photoCardId,
        userPhotoCardId: saleCard.userPhotoCardId,
      },
      include: {
        photoCard: {
          include: {
            creator: true,
          },
        },
        seller: { select: { nickname: true } },
        userPhotoCard: true,
      },
    });

    // 2. 새로운 판매 오퍼 생성
    await tx.marketOffer.create({
      data: {
        type: "SALE",
        ownerId: userId,
        saleCardId: newSaleCard.id,
        exchangeOfferId: null,
      },
    });

    // 3. 기존 판매 카드 상태 변경
    await tx.saleCard.update({
      where: { id: saleCardId },
      data: {
        status: "CANCELED",
        updatedAt: new Date(),
      },
    });

    // 5. 교환 제안 처리 - 기존 제안을 새 판매 카드로 업데이트
    if (pendingOffers.length > 0) {
      // 기존 교환 제안들의 ID 목록
      const pendingOfferIds = pendingOffers.map((offer) => offer.id);

      // 교환 제안들의 saleCardId를 새 판매 카드로 업데이트
      await tx.exchangeOffer.updateMany({
        where: {
          id: {
            in: pendingOfferIds,
          },
          status: "PENDING",
        },
        data: {
          saleCardId: newSaleCard.id,
          updatedAt: new Date(),
        },
      });
    }

    return newSaleCard;
  });

  // 교환 제안자들에게 알림 보내기
  for (const offer of pendingOffers) {
    await createNotification({
      userId: offer.offererId,
      message: `[${photoCardInfo.name}] 판매글이 수정되었습니다. 수정된 판매글로 교환 제안이 이전되었습니다.`,
    });
  }

  return createResponseObject(result, userId);
};

// 판매 등록한 포토카드 취소
const cancelMarketItem: CancelMarketItem = async (saleCardId, userId) => {
  // 판매 중인 카드 검증
  const saleCard = await validateSaleCard(saleCardId, userId);

  // 판매 카드 정보 미리 저장
  const photoCardInfo = {
    grade: saleCard.photoCard.grade,
    name: saleCard.photoCard.name,
  };

  // 트랜잭션으로 모든 작업 처리
  const { canceledCard, pendingOffers } = await prisma.$transaction(
    async (tx) => {
      // 대기 중인 교환 제안 조회 및 취소
      const pendingOffers = await tx.exchangeOffer.findMany({
        where: {
          saleCardId,
          status: "PENDING",
        },
        select: {
          offererId: true,
        },
      });

      // 대기 중인 교환 제안 취소
      await tx.exchangeOffer.updateMany({
        where: {
          saleCardId,
          status: "PENDING",
        },
        data: {
          status: "FAILED",
          updatedAt: new Date(),
        },
      });

      // 판매 카드 취소 처리
      const canceledCard = await tx.saleCard.update({
        where: { id: saleCardId },
        data: {
          status: "CANCELED",
          updatedAt: new Date(),
        },
        include: {
          photoCard: {
            include: {
              creator: true,
            },
          },
          seller: { select: { nickname: true } },
          userPhotoCard: true,
        },
      });

      return { canceledCard, pendingOffers };
    }
  );

  // 교환 제안자들에게 알림 보내기
  for (const offer of pendingOffers) {
    await createNotification({
      userId: offer.offererId,
      message: `[${photoCardInfo.name}] 판매가 취소되어 교환 제안이 취소되었습니다.`,
    });
  }

  // 응답 객체 생성 (취소된 카드는 remaining과 total이 다를 수 있음)
  const response = createResponseObject(canceledCard, userId);
  response.total = canceledCard.userPhotoCard.quantity;

  return response;
};

const marketUpdateService = {
  updateMarketItem,
  cancelMarketItem,
};

export default marketUpdateService;
