import { PrismaClient } from "@prisma/client";
import {
  BasicDetail,
  ExchangeInfo,
  Offer,
} from "../interfaces/detail.interfaces";

const prisma = new PrismaClient();

/**
 * 마켓 아이템 기본 상세 정보 조회
 *
 * @param id 판매 카드 ID
 * @param userId 현재 로그인한 사용자 ID
 * @returns 마켓 아이템 기본 상세 정보
 */
export const getBasicDetail = async (
  id: string,
  userId: string
): Promise<BasicDetail> => {
  const saleCard = await prisma.saleCard.findUnique({
    where: { id },
    include: {
      photoCard: true,
    },
  });

  if (!saleCard) {
    throw new Error(`ID가 ${id}인 판매 카드를 찾을 수 없습니다.`);
  }

  if (!saleCard.photoCard) {
    throw new Error(
      `ID가 ${saleCard.photoCardId}인 포토카드를 찾을 수 없습니다.`
    );
  }

  const seller = await prisma.user.findUnique({
    where: { id: saleCard.sellerId },
  });

  if (!seller) {
    throw new Error(
      `ID가 ${saleCard.sellerId}인 판매자 정보를 찾을 수 없습니다.`
    );
  }

  const creator = await prisma.user.findUnique({
    where: { id: saleCard.photoCard.creatorId },
  });

  if (!creator) {
    throw new Error(
      `ID가 ${saleCard.photoCard.creatorId}인 원작자 정보를 찾을 수 없습니다.`
    );
  }

  const isMine = saleCard.sellerId === userId;

  let totalOwnAmount = 0;
  try {
    const sellerPhotoCards = await prisma.userPhotoCard.findMany({
      where: {
        photoCardId: saleCard.photoCardId,
        ownerId: saleCard.sellerId,
      },
    });

    totalOwnAmount = sellerPhotoCards.reduce(
      (sum, card) => sum + card.quantity,
      0
    );

    const exchangeOffers = await prisma.exchangeOffer.findMany({
      where: {
        offererId: saleCard.sellerId,
        status: "PENDING",
      },
      include: {
        userPhotoCard: true,
      },
    });

    let exchangeOfferCount = 0;

    if (exchangeOffers.length > 0) {
      for (const offer of exchangeOffers) {
        if (
          offer.userPhotoCard &&
          offer.userPhotoCard.photoCardId === saleCard.photoCardId
        ) {
          exchangeOfferCount += 1;
        }
      }

      totalOwnAmount -= exchangeOfferCount;
    }
  } catch (error) {
    console.error("판매자의 포토카드 소유 정보 조회 중 오류:", error);
  }

  const completedTransactions = await prisma.transactionLog.findMany({
    where: {
      saleCardId: saleCard.id,
      transactionType: {
        in: ["EXCHANGE", "SALE"],
      },
    },
  });

  const completedQuantity = completedTransactions.reduce(
    (sum, transaction) => sum + transaction.quantity,
    0
  );

  const response: BasicDetail = {
    id: saleCard.id,
    creatorNickname: creator.nickname,
    imageUrl: saleCard.photoCard.imageUrl,
    name: saleCard.photoCard.name,
    grade: saleCard.photoCard.grade,
    genre: saleCard.photoCard.genre,
    description: saleCard.photoCard.description,
    price: saleCard.price,
    availableAmount: Math.min(
      saleCard.quantity - completedQuantity,
      totalOwnAmount
    ),
    totalAmount: saleCard.quantity,
    totalOwnAmount,
    createdAt: saleCard.createdAt.toISOString(),
    exchangeDetail: {
      grade: saleCard.exchangeGrade,
      genre: saleCard.exchangeGenre,
      description: saleCard.exchangeDescription,
    },
    isMine,
  };

  return response;
};

/**
 * 교환 제안에 대한 상세 정보를 조회하는 헬퍼 함수
 * @param offer 교환 제안 정보
 * @param userId 현재 사용자 ID
 * @returns 교환 제안 상세 정보
 */
async function getOfferDetails(offer: any, userId: string): Promise<Offer> {
  const userPhotoCard = await prisma.userPhotoCard.findUnique({
    where: { id: offer.userPhotoCardId },
  });

  if (!userPhotoCard) {
    throw new Error(
      `제안된 카드 정보를 찾을 수 없습니다. ID: ${offer.userPhotoCardId}`
    );
  }

  const offeredCard = await prisma.photoCard.findUnique({
    where: { id: userPhotoCard.photoCardId },
    include: {
      creator: {
        select: { nickname: true },
      },
    },
  });

  const offerer = await prisma.user.findUnique({
    where: { id: offer.offererId || userId },
  });

  if (!offeredCard || !offerer) {
    throw new Error(`교환 제안 정보를 찾을 수 없습니다. ID: ${offer.id}`);
  }

  return {
    id: offer.id,
    creatorNickname: offeredCard.creator.nickname,
    name: offeredCard.name,
    description: offer.content,
    imageUrl: offeredCard.imageUrl,
    grade: offeredCard.grade,
    genre: offeredCard.genre,
    price: offeredCard.price,
    createdAt: offer.createdAt.toISOString(),
  };
}

/**
 * 마켓 아이템 교환 제안 정보 조회
 *
 * @param id 판매 카드 ID
 * @param userId 현재 로그인한 사용자 ID
 * @returns 마켓 아이템 교환 제안 정보
 */
export const getExchangeDetail = async (
  id: string,
  userId: string
): Promise<ExchangeInfo> => {
  const saleCard = await prisma.saleCard.findUnique({
    where: { id },
  });

  if (!saleCard) {
    throw new Error(`ID가 ${id}인 판매 카드를 찾을 수 없습니다.`);
  }

  const isMine = saleCard.sellerId === userId;

  const response: ExchangeInfo = {
    saleId: saleCard.id,
    isMine,
    receivedOffers: isMine ? [] : null,
    myOffers: isMine ? null : [],
  };

  if (isMine) {
    const exchangeOffers = await prisma.exchangeOffer.findMany({
      where: {
        saleCardId: id,
        status: "PENDING",
      },
    });

    if (exchangeOffers.length > 0) {
      const offersWithDetails: Offer[] = await Promise.all(
        exchangeOffers.map((offer) => getOfferDetails(offer, userId))
      );
      response.receivedOffers = offersWithDetails;
    }
  } else {
    const myOffers = await prisma.exchangeOffer.findMany({
      where: {
        saleCardId: id,
        offererId: userId,
        status: "PENDING",
      },
    });

    if (myOffers.length > 0) {
      const myOffersWithDetails: Offer[] = await Promise.all(
        myOffers.map((offer) => getOfferDetails(offer, userId))
      );
      response.myOffers = myOffersWithDetails;
    }
  }

  return response;
};
