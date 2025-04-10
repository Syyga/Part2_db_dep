import {
  toMarketMeResponse,
  toMarketResponse,
} from "../../../utils/mappers/market.mapper";
import prisma from "../../../utils/prismaClient";
import {
  GetMarketList,
  GetMarketListCount,
  GetMarketMeCount,
  GetMarketMeList,
  MarketCardDto,
  PhotoCardInfo,
} from "../types/market.type";
import { MarketOfferDto } from "../../../utils/dtos/marketOffer.dto";
import {
  allGenres,
  allGrades,
  allMarketStatus,
  allSaleStatus,
} from "../../../types/enums.type";

/**
 *
 * @param queries
 * @returns
 */
const getMarketList: GetMarketList = async (queries) => {
  const { keyword, genre, grade, cursor, limit = 15 } = queries;

  const saleCards: MarketCardDto[] = await prisma.saleCard.findMany({
    where: {
      AND: [
        cursor
          ? {
              OR: [
                { createdAt: { lt: cursor.createdAt } },
                {
                  createdAt: cursor.createdAt,
                  id: { lt: cursor.id },
                },
              ],
            }
          : {},
        {
          photoCard: {
            AND: [
              keyword
                ? {
                    OR: [
                      { name: { contains: keyword, mode: "insensitive" } },
                      {
                        description: { contains: keyword, mode: "insensitive" },
                      },
                    ],
                  }
                : {},
              genre ? { genre } : {},
              grade ? { grade } : {},
            ],
          },
        },
        {
          status: {
            in: ["ON_SALE", "SOLD_OUT"],
          },
        },
      ],
    },
    take: limit,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: {
      seller: { select: { id: true, nickname: true } },
      userPhotoCard: { select: { quantity: true } },
      photoCard: {
        select: {
          creator: { select: { id: true, nickname: true } },
          name: true,
          genre: true,
          grade: true,
          description: true,
          imageUrl: true,
        },
      },
    },
  });

  // console.log(JSON.stringify(saleCards, null, 2));

  const saleCardIds = saleCards.map((card) => card.id);

  const transactions = await prisma.transactionLog.groupBy({
    by: ["saleCardId"],
    where: {
      saleCardId: { in: saleCardIds },
    },
    _sum: {
      quantity: true,
    },
  });

  const transactionMap = new Map(
    transactions.map(
      (t: { saleCardId: string; _sum: { quantity: number | null } }) => [
        t.saleCardId,
        t._sum.quantity || 0,
      ]
    )
  );

  const data = saleCards.map((card) =>
    toMarketResponse(card, Number(transactionMap.get(card.id) || 0))
  );

  // console.log(data);

  /* */
  let gradeResult = (await prisma.$queryRaw`
  SELECT "photoCard"."grade", COUNT(*)
  FROM "SaleCard" AS "saleCard"
  JOIN "PhotoCard" AS "photoCard" ON "saleCard"."photoCardId" = "photoCard"."id"
  GROUP BY "photoCard"."grade"
`) as { grade: string; count: number }[];
  const gradeMap = new Map(gradeResult.map((r) => [r.grade, Number(r.count)]));
  const gradeInfo: PhotoCardInfo[] = allGrades.map((genre) => ({
    name: genre,
    count: gradeMap.get(genre) || 0,
  }));

  /* */
  const genreResult = (await prisma.$queryRaw`
    SELECT "photoCard"."genre", COUNT(*)
    FROM "SaleCard" AS "saleCard"
    JOIN "PhotoCard" AS "photoCard" ON "saleCard"."photoCardId" = "photoCard"."id"
    GROUP BY "photoCard"."genre"
  `) as { genre: string; count: number }[];
  const resultMap = new Map(genreResult.map((r) => [r.genre, Number(r.count)]));
  const genreInfo: PhotoCardInfo[] = allGenres.map((genre) => ({
    name: genre,
    count: resultMap.get(genre) || 0,
  }));

  /* */
  let statusResult = await prisma.saleCard.groupBy({
    by: ["status"],
    _count: {
      _all: true,
    },
  });
  const statusMap = new Map(statusResult.map((r) => [r.status, r._count._all]));
  const statusInfo: PhotoCardInfo[] = allSaleStatus.map((status) => ({
    name: status,
    count: statusMap.get(status) || 0,
  }));

  /* */
  const hasMore = data.length === limit;
  const nextCursor = hasMore
    ? {
        createdAt: saleCards[data.length - 1].createdAt.toISOString(),
        id: saleCards[data.length - 1].id,
      }
    : null;

  return {
    hasMore,
    nextCursor,
    list: data,
    info: {
      grade: gradeInfo,
      genre: genreInfo,
      status: statusInfo,
    },
  };
};

const getMarketMe: GetMarketMeList = async (queries, user) => {
  const { keyword, genre, grade, status, cursor, limit = 15 } = queries;
  const userId = user.id;

  const marketOffers: MarketOfferDto[] = await prisma.marketOffer.findMany({
    take: limit,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: {
      saleCard: { include: { photoCard: { include: { creator: true } } } },
      exchangeOffer: {
        include: {
          saleCard: true,
          userPhotoCard: {
            include: { photoCard: { include: { creator: true } } },
          },
        },
      },
    },
    where: {
      AND: [
        cursor
          ? {
              OR: [
                { createdAt: { lt: cursor.createdAt } },
                {
                  createdAt: { equals: cursor.createdAt },
                  id: { lt: cursor.id },
                },
              ],
            }
          : {},
        {
          ownerId: userId,
        },
      ],
      OR: [
        {
          type: "SALE",
          saleCard: {
            status: status || {
              in: ["ON_SALE", "SOLD_OUT"],
            }, // status가 없으면 undefined로 설정
            photoCard: {
              AND: [
                keyword
                  ? {
                      OR: [
                        { name: { contains: keyword } },
                        { description: { contains: keyword } },
                      ],
                    }
                  : {},
                genre ? { genre: genre } : {},
                grade ? { grade: grade } : {},
              ],
            },
          },
        },
        {
          type: "EXCHANGE",
          exchangeOffer: {
            status: status || {
              in: ["PENDING"],
            }, // status가 없으면 undefined로 설정
            saleCard: {
              photoCard: {
                AND: [
                  keyword
                    ? {
                        OR: [
                          { name: { contains: keyword } },
                          { description: { contains: keyword } },
                        ],
                      }
                    : {},
                  genre ? { genre: genre } : {},
                  grade ? { grade: grade } : {},
                ],
              },
            },
          },
        },
      ],
    },
  });

  // console.log(JSON.stringify(marketOffers, null, 2));

  const saleCardIds = marketOffers
    .filter((offer) => offer.type === "SALE" && offer.saleCardId) // null 제거
    .map((offer) => offer.saleCardId as string); // 타입 확정

  const quantities = await prisma.transactionLog.groupBy({
    by: ["saleCardId"],
    where: { saleCardId: { in: saleCardIds } },
    _sum: { quantity: true },
  });

  const quantityMap = Object.fromEntries(
    quantities.map((q) => [q.saleCardId, q._sum?.quantity ?? 0])
  );

  const enrichedOffers: MarketOfferDto[] = marketOffers.map((offer) => {
    if (offer.type === "SALE") {
      return {
        ...offer,
        totalTradedQuantity: offer.saleCardId
          ? quantityMap[offer.saleCardId] || 0
          : 0,
      };
    }
    return offer;
  });

  // console.log(JSON.stringify(enrichedOffers, null, 2));

  // console.log(enrichedOffers);

  const data = enrichedOffers.map((card) => toMarketMeResponse(card));

  const hasMore = data.length === limit;
  const nextCursor = hasMore
    ? {
        createdAt: marketOffers[data.length - 1].createdAt.toISOString(),
        id: marketOffers[data.length - 1].id,
      }
    : null;

  /* */
  const marketOffersTmp = await prisma.marketOffer.findMany({
    where: { ownerId: userId },
    select: {
      type: true,
      saleCard: {
        where: {
          status: { in: ["ON_SALE", "SOLD_OUT"] },
        },
        select: {
          photoCard: {
            select: {
              grade: true,
              genre: true,
            },
          },
          status: true,
        },
      },
      exchangeOffer: {
        where: {
          status: "PENDING",
        },
        select: {
          saleCard: {
            select: {
              photoCard: {
                select: {
                  grade: true,
                  genre: true,
                },
              },
              status: true,
            },
          },
          status: true,
        },
      },
    },
  });

  // gradeInfo
  const gradeInfo = allGrades.map((grade) => {
    const count = marketOffersTmp.filter(
      (offer) =>
        (offer.type === "SALE" && offer.saleCard?.photoCard?.grade === grade) ||
        (offer.type === "EXCHANGE" &&
          offer.exchangeOffer?.saleCard?.photoCard?.grade === grade)
    ).length;

    return { name: grade, count };
  });

  // genreInfo
  const genreInfo = allGenres.map((genre) => {
    const count = marketOffersTmp.filter(
      (offer) =>
        (offer.type === "SALE" && offer.saleCard?.photoCard?.genre === genre) ||
        (offer.type === "EXCHANGE" &&
          offer.exchangeOffer?.saleCard?.photoCard?.genre === genre)
    ).length;

    return { name: genre, count };
  });

  // statusInfo
  const statusInfo = allMarketStatus.map((status) => {
    const count = marketOffersTmp.filter(
      (offer) =>
        (status === "PENDING" &&
          offer.type === "EXCHANGE" &&
          offer.exchangeOffer?.status === status) ||
        (status !== "PENDING" &&
          offer.type === "SALE" &&
          offer.saleCard?.status === status)
    ).length;

    return { name: status, count };
  });

  return {
    hasMore,
    nextCursor,
    list: data,
    info: {
      grade: gradeInfo,
      genre: genreInfo,
      status: statusInfo,
    },
  };
};

/**
 *
 * @param queries
 * @returns
 */
const getMarketListCount: GetMarketListCount = async (queries) => {
  const { genre, grade, status } = queries;

  const count = await prisma.saleCard.count({
    where: {
      ...(status && { status: status }),
      photoCard: {
        ...(grade && { grade: grade }),
        ...(genre && { genre: genre }),
      },
    },
  });

  return {
    grade: grade || "ALL",
    genre: genre || "ALL",
    status: status || "ALL",
    count,
  };
};

/**
 *
 * @param queries
 * @param userId
 * @returns
 */
const getMarketMeCount: GetMarketMeCount = async (queries, userId) => {
  const { genre, grade, status } = queries;

  const isExchange = status === "PENDING";
  const isSale = status === "ON_SALE" || status === "SOLD_OUT";

  let where: any = {
    ownerId: userId,
  };

  if (!status) {
    // status 없을 때 (모두 사용)
    where = {
      ownerId: userId,
      OR: [
        {
          type: "SALE",
          saleCard: {
            photoCard: {
              ...(grade ? { grade } : {}),
              ...(genre ? { genre } : {}),
            },
          },
        },
        {
          type: "EXCHANGE",
          exchangeOffer: {
            saleCard: {
              photoCard: {
                ...(grade ? { grade } : {}),
                ...(genre ? { genre } : {}),
              },
            },
          },
        },
      ],
    };
  } else if (isSale) {
    // ON_SALE | SOLD_OUT
    where = {
      ownerId: userId,
      type: "SALE",
      saleCard: {
        status,
        photoCard: {
          ...(grade ? { grade } : {}),
          ...(genre ? { genre } : {}),
        },
      },
    };
  } else if (isExchange) {
    // PENDING
    where = {
      ownerId: userId,
      type: "EXCHANGE",
      exchangeOffer: {
        status: "PENDING",
        saleCard: {
          photoCard: {
            ...(grade ? { grade } : {}),
            ...(genre ? { genre } : {}),
          },
        },
      },
    };
  }

  const count = await prisma.marketOffer.count({ where });

  return {
    grade: grade || "ALL",
    genre: genre || "ALL",
    status: status || "ALL",
    count,
  };
};

const marketService = {
  getMarketList,
  getMarketMe,
  getMarketListCount,
  getMarketMeCount,
};

export default marketService;
