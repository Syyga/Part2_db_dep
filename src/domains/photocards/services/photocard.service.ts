import { PrismaClient } from "@prisma/client";
import {
  MyPhotocardsQuery,
  MyPhotocards,
  GradeCounts,
  PhotocardInfo,
  FilterPhotoCard,
  Cursor,
  CreatePhotocardRequest,
} from "../types/photocard.type";
import { PHOTOCARD_GENRES } from "../constants/filter.constant";
import { Prisma } from "@prisma/client";
import { CustomError } from "../../../utils/errors";

const prisma = new PrismaClient();

/**
 * 사용자 포토카드 목록 조회
 * @param userId 사용자 ID
 * @param queries 쿼리 파라미터
 */
const getMyPhotocards = async (
  userId: string,
  queries: MyPhotocardsQuery
): Promise<MyPhotocards> => {
  const { keyword, grade, genre, limit = 15, cursor } = queries;

  // 사용자 정보 조회
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!currentUser) {
    throw new Error("사용자를 찾을 수 없습니다.");
  }

  // 등급별 카드 개수 조회
  const gradeCounts = await getGradeCounts(userId);

  // 필터링 정보 조회
  const filterInfo = await getFilterInfo(userId);

  // 커서 설정
  let nextCursor: Cursor | null = null;
  let hasMore = false;

  if (cursor) {
    nextCursor = {
      id: cursor.id,
    };
  }

  // 사용자의 포토카드 목록 조회 (커서 기준 페이지네이션)
  const userPhotoCardsQuery: any = {
    where: {
      ownerId: userId,
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
  };

  if (nextCursor) {
    userPhotoCardsQuery.cursor = {
      id: nextCursor.id,
    };
    userPhotoCardsQuery.skip = 1;

    // createdAt이 있으면 OR 조건으로 커서 설정
    if (nextCursor.createdAt) {
      userPhotoCardsQuery.where.OR = [
        { createdAt: { lt: new Date(nextCursor.createdAt) } },
        {
          createdAt: { equals: new Date(nextCursor.createdAt) },
          id: { lt: nextCursor.id },
        },
      ];
      delete userPhotoCardsQuery.cursor;
      delete userPhotoCardsQuery.skip;
    }
  }

  const userPhotoCards = await prisma.userPhotoCard.findMany(
    userPhotoCardsQuery
  );

  // 다음 페이지 존재 여부 확인
  if (userPhotoCards.length > limit) {
    hasMore = true;
    userPhotoCards.pop(); // 마지막 항목 제거
    const lastItem = userPhotoCards[userPhotoCards.length - 1];
    nextCursor = {
      id: lastItem.id,
      createdAt: lastItem.createdAt.toISOString(),
    };
  } else {
    nextCursor = null;
  }

  // 판매 중인 카드의 수량 조회
  const saleCards = await prisma.saleCard.findMany({
    where: {
      sellerId: userId,
      status: "ON_SALE",
      userPhotoCardId: {
        in: userPhotoCards.map((card) => card.id),
      },
    },
    select: {
      userPhotoCardId: true,
      quantity: true,
    },
  });

  // 교환 제시 중(PENDING)인 카드 수량 조회
  const exchangeOffers = await prisma.exchangeOffer.findMany({
    where: {
      offererId: userId,
      status: "PENDING",
      userPhotoCardId: {
        in: userPhotoCards.map((card) => card.id),
      },
    },
    select: {
      userPhotoCardId: true,
    },
  });

  // 교환 제시 중인 카드 수량 맵 (제안 1개당 1장 교환)
  const exchangeOfferMap = new Map();
  exchangeOffers.forEach((offer) => {
    const count = exchangeOfferMap.get(offer.userPhotoCardId) || 0;
    exchangeOfferMap.set(offer.userPhotoCardId, count + 1);
  });

  // 판매 중인 카드의 수량 맵 생성
  const saleCardMap = new Map();
  saleCards.forEach((card) => {
    saleCardMap.set(card.userPhotoCardId, card.quantity);
  });

  // 가용 수량이 1 이상인 카드만 필터링
  const availableUserPhotoCards = userPhotoCards.filter((card) => {
    const saleQuantity = saleCardMap.get(card.id) || 0;
    const offerQuantity = exchangeOfferMap.get(card.id) || 0;
    return card.quantity - saleQuantity - offerQuantity > 0;
  });

  // 포토카드 ID 목록 (가용 수량이 있는 것만)
  const photoCardIds = availableUserPhotoCards.map((card) => card.photoCardId);

  // 필터링 조건 구성
  const photoCardWhereClause = await buildWhereClause({
    photoCardIds,
    keyword,
    grade,
    genre,
  });

  // 포토카드 정보 조회
  const photoCards = await prisma.photoCard.findMany({
    where: photoCardWhereClause,
    include: {
      creator: {
        select: {
          nickname: true,
        },
      },
    },
  });

  // 실제 가용 수량 계산
  const userPhotoCardMap = new Map();
  availableUserPhotoCards.forEach((card) => {
    const saleQuantity = saleCardMap.get(card.id) || 0;
    const offerQuantity = exchangeOfferMap.get(card.id) || 0;
    userPhotoCardMap.set(card.photoCardId, {
      userPhotoCardId: card.id,
      quantity: card.quantity - saleQuantity - offerQuantity,
    });
  });

  // 응답 데이터 매핑
  const mappedPhotocards: PhotocardInfo[] = photoCards
    .map((photoCard) => {
      const cardInfo = userPhotoCardMap.get(photoCard.id);
      if (!cardInfo) return null; // 가용 수량 없으면 null

      return {
        id: cardInfo.userPhotoCardId,
        name: photoCard.name,
        imageUrl: photoCard.imageUrl,
        grade: photoCard.grade,
        genre: photoCard.genre,
        description: photoCard.description,
        price: photoCard.price,
        amount: cardInfo.quantity,
        createdAt: photoCard.createdAt.toISOString(),
        creatorNickname: photoCard.creator.nickname,
      };
    })
    .filter(Boolean) as PhotocardInfo[]; // null 값 필터링

  // 필터링 후 결과가 없는 경우
  if (mappedPhotocards.length === 0) {
    return {
      userNickname: currentUser.nickname,
      gradeCounts,
      list: null,
      nextCursor,
      hasMore: false,
      filterInfo,
    };
  }

  // 최종 응답 반환
  return {
    userNickname: currentUser.nickname,
    gradeCounts,
    list: mappedPhotocards,
    nextCursor,
    hasMore,
    filterInfo,
  };
};

/**
 * 필터링 조건을 구성하는 함수
 */
const buildWhereClause = async ({
  photoCardIds,
  keyword,
  grade,
  genre,
}: {
  photoCardIds: string[];
  keyword?: string;
  grade?: string;
  genre?: string;
}) => {
  // 필터링 조건 구성
  const photoCardWhereClause: any = {
    id: { in: photoCardIds },
  };

  // 검색 조건 추가
  if (keyword) {
    photoCardWhereClause.OR = [
      { name: { contains: keyword, mode: "insensitive" } },
      { description: { contains: keyword, mode: "insensitive" } },
    ];
  }

  // 등급 필터 추가 - 값이 제공되고 "ALL"이 아닌 경우에만 필터링
  if (grade && grade !== "ALL") {
    photoCardWhereClause.grade = grade;
  }

  // 장르 필터 추가 - 값이 제공되고 "ALL"이 아닌 경우에만 필터링
  if (genre && genre !== "ALL") {
    // 유효한 장르인지 확인
    const validGenres = [...PHOTOCARD_GENRES] as string[];
    if (validGenres.includes(genre)) {
      photoCardWhereClause.genre = genre;
    }
  }

  return photoCardWhereClause;
};

/**
 * 필터 옵션에 따른 포토카드 개수 조회
 */
const getMyPhotocardsCount = async (
  userId: string,
  filters: { grade?: string; genre?: string }
): Promise<number> => {
  // 사용자 존재 여부 확인
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("사용자를 찾을 수 없습니다.");
  }

  // 사용자의 포토카드 목록 조회
  const userPhotoCards = await prisma.userPhotoCard.findMany({
    where: { ownerId: userId },
  });

  if (userPhotoCards.length === 0) {
    return 0;
  }

  // 포토카드 ID 목록
  const photoCardIds = userPhotoCards.map((card) => card.photoCardId);

  // 필터링 조건 구성
  const photoCardWhereClause = await buildWhereClause({
    photoCardIds,
    grade: filters.grade,
    genre: filters.genre,
  });

  // 포토카드 개수 조회
  const count = await prisma.photoCard.count({
    where: photoCardWhereClause,
  });

  return count;
};

/**
 * 사용자가 보유한 등급별 카드 개수를 조회하는 함수
 */
const getGradeCounts = async (userId: string): Promise<GradeCounts> => {
  // 등급별 카드 개수 초기화
  const gradeCounts: GradeCounts = {
    COMMON: 0,
    RARE: 0,
    SUPER_RARE: 0,
    LEGENDARY: 0,
  };

  // 판매 중인 카드와 교환 제시 중인 카드를 고려한 SQL 쿼리
  const result = await prisma.$queryRaw`
    WITH SaleQuantities AS (
      SELECT 
        up."photoCardId",
        COALESCE(SUM(s."quantity"), 0) as sale_quantity
      FROM "SaleCard" s
      JOIN "UserPhotoCard" up ON s."userPhotoCardId" = up."id"
      WHERE s."sellerId" = ${userId} AND s."status" = 'ON_SALE'
      GROUP BY up."photoCardId"
    ),
    ExchangeQuantities AS (
      SELECT 
        u."photoCardId",
        COUNT(*) as offer_quantity
      FROM "ExchangeOffer" e
      JOIN "UserPhotoCard" u ON e."userPhotoCardId" = u."id"
      WHERE e."offererId" = ${userId} AND e."status" = 'PENDING'
      GROUP BY u."photoCardId"
    )
    SELECT 
      p."grade", 
      COUNT(DISTINCT u."photoCardId") as count
    FROM "UserPhotoCard" u
    JOIN "PhotoCard" p ON u."photoCardId" = p."id"
    LEFT JOIN SaleQuantities sq ON u."photoCardId" = sq."photoCardId"
    LEFT JOIN ExchangeQuantities eq ON u."photoCardId" = eq."photoCardId"
    WHERE 
      u."ownerId" = ${userId}
      AND (u."quantity" - COALESCE(sq.sale_quantity, 0) - COALESCE(eq.offer_quantity, 0)) > 0
    GROUP BY p."grade"
  `;

  // 결과 매핑
  (result as { grade: string; count: string }[]).forEach((item) => {
    const grade = item.grade;
    if (grade in gradeCounts) {
      gradeCounts[grade as keyof GradeCounts] = parseInt(item.count, 10);
    }
  });

  return gradeCounts;
};

/**
 * 필터링 정보를 조회하는 함수
 */
const getFilterInfo = async (userId: string): Promise<FilterPhotoCard> => {
  // 판매 중인 카드와 교환 제시 중인 카드를 고려한 공통 쿼리 부분
  const commonQueryPart = `
    WITH SaleQuantities AS (
      SELECT 
        up."photoCardId",
        COALESCE(SUM(s."quantity"), 0) as sale_quantity
      FROM "SaleCard" s
      JOIN "UserPhotoCard" up ON s."userPhotoCardId" = up."id"
      WHERE s."sellerId" = '${userId}' AND s."status" = 'ON_SALE'
      GROUP BY up."photoCardId"
    ),
    ExchangeQuantities AS (
      SELECT 
        u."photoCardId",
        COUNT(*) as offer_quantity
      FROM "ExchangeOffer" e
      JOIN "UserPhotoCard" u ON e."userPhotoCardId" = u."id"
      WHERE e."offererId" = '${userId}' AND e."status" = 'PENDING'
      GROUP BY u."photoCardId"
    )
  `;

  // 등급별 필터 정보 조회
  const gradeFilterQuery = await prisma.$queryRaw`
    ${Prisma.raw(commonQueryPart)}
    SELECT 
      p."grade" as name, 
      COUNT(DISTINCT u."photoCardId") as count
    FROM "UserPhotoCard" u
    JOIN "PhotoCard" p ON u."photoCardId" = p."id"
    LEFT JOIN SaleQuantities sq ON u."photoCardId" = sq."photoCardId"
    LEFT JOIN ExchangeQuantities eq ON u."photoCardId" = eq."photoCardId"
    WHERE 
      u."ownerId" = ${userId}
      AND (u."quantity" - COALESCE(sq.sale_quantity, 0) - COALESCE(eq.offer_quantity, 0)) > 0
    GROUP BY p."grade"
    ORDER BY count DESC
  `;

  // 장르별 필터 정보 조회
  const genreFilterQuery = await prisma.$queryRaw`
    ${Prisma.raw(commonQueryPart)}
    SELECT 
      p."genre" as name, 
      COUNT(DISTINCT u."photoCardId") as count
    FROM "UserPhotoCard" u
    JOIN "PhotoCard" p ON u."photoCardId" = p."id"
    LEFT JOIN SaleQuantities sq ON u."photoCardId" = sq."photoCardId"
    LEFT JOIN ExchangeQuantities eq ON u."photoCardId" = eq."photoCardId"
    WHERE 
      u."ownerId" = ${userId}
      AND (u."quantity" - COALESCE(sq.sale_quantity, 0) - COALESCE(eq.offer_quantity, 0)) > 0
    GROUP BY p."genre"
    ORDER BY count DESC
  `;

  // 결과 매핑
  const gradeFilter = (
    gradeFilterQuery as { name: string; count: string }[]
  ).map((item) => ({
    name: item.name,
    count: parseInt(item.count, 10),
  }));

  const genreFilter = (
    genreFilterQuery as { name: string; count: string }[]
  ).map((item) => ({
    name: item.name,
    count: parseInt(item.count, 10),
  }));

  return {
    grade: gradeFilter.length > 0 ? gradeFilter : null,
    genre: genreFilter.length > 0 ? genreFilter : null,
  };
};

/**
 * 포토카드 생성 서비스
 * @param data 포토카드 생성 데이터
 * @param imageUrl 이미지 URL
 * @param userId 사용자 ID
 * @returns 생성된 포토카드 정보
 */
const createPhotocard = async (
  data: CreatePhotocardRequest,
  imageUrl: string,
  userId: string
) => {
  try {
    // 포토카드 생성
    const photocard = await prisma.photoCard.create({
      data: {
        name: data.name,
        genre: data.genre,
        grade: data.grade,
        price: data.price,
        description: data.description,
        imageUrl: imageUrl,
        creatorId: userId,
      },
    });

    // 등급에 따른 발행 장수 설정
    let amount = 1; // 기본값 1로 설정
    switch (data.grade) {
      case "LEGENDARY":
        amount = 1;
        break;
      case "SUPER_RARE":
        amount = 3;
        break;
      case "RARE":
        amount = 8;
        break;
      case "COMMON":
        amount = 20;
        break;
    }

    // 포토카드 생성 후 자동으로 사용자의 소유 카드로 등록 (수량은 등급에 따라 설정)
    await prisma.userPhotoCard.create({
      data: {
        photoCardId: photocard.id,
        ownerId: userId,
        quantity: amount,
      },
    });

    // 응답에 amount 추가
    return {
      ...photocard,
      amount,
    };
  } catch (error) {
    console.error("포토카드 생성 중 오류 발생:", error);
    throw new Error("포토카드 생성에 실패했습니다.");
  }
};

// 내 포토카드 상세조회 서비스
const getMyPhotoCardDetailService = async (
  userId: string,
  userPhotoCardId: string
) => {
  const isOwner = await prisma.userPhotoCard.findUnique({
    where: { id: userPhotoCardId },
  });

  if (!isOwner) {
    throw new CustomError("해당 포토카드를 소유하고 있지 않습니다.", 400);
  }

  const { photoCardId, quantity } = isOwner;

  const userPhotoCard = await prisma.photoCard.findUnique({
    where: {
      id: photoCardId,
    },
    include: {
      creator: { select: { nickname: true } },
    },
  });
  if (!userPhotoCard) {
    throw new CustomError("포토카드가 존재하지 않습니다.", 400);
  }

  console.log(userPhotoCard);

  const saleCount = await prisma.saleCard.findMany({
    where: {
      sellerId: userId,
      photoCardId: photoCardId,
    },
    select: {
      quantity: true,
    },
  });

  // 판매중인 포토 카드
  const totalSaleCount = saleCount.reduce(
    (acc, item) => acc + item.quantity,
    0
  );

  // 보유한 포토카드 - 판매중인 포토카드
  const availableAmount = quantity - totalSaleCount;

  return {
    grade: userPhotoCard.grade,
    genre: userPhotoCard.genre,
    name: userPhotoCard.name,
    price: userPhotoCard.price,
    availableAmount,
    creator: userPhotoCard.creator.nickname,
    description: userPhotoCard.description,
    imageUrl: userPhotoCard.imageUrl,
    userPhotoCardId: userPhotoCardId,
  };
};

// 서비스 함수 내보내기
const photocardService = {
  getMyPhotocards,
  getGradeCounts,
  getFilterInfo,
  getMyPhotocardsCount,
  createPhotocard,
  getMyPhotoCardDetailService,
};

export default photocardService;
