import {
  MarketCardDto,
  MarketMeResponse,
  MarketResponse,
} from "../../domains/market/types/market.type";
import { MarketOfferDto } from "../dtos/marketOffer.dto";

export const toMarketResponse = (
  card: MarketCardDto,
  count: number
): MarketResponse => {
  return {
    saleCardId: card.id,
    userPhotoCardId: card.photoCardId,
    status: card.status,
    name: card.photoCard.name,
    genre: card.photoCard.genre,
    grade: card.photoCard.grade,
    price: card.price,
    image: card.photoCard.imageUrl,
    total: card.quantity,
    remaining: card.quantity - count,
    exchangeDescription: card.exchangeDescription,
    exchangeGrade: card.exchangeGrade,
    exchangeGenre: card.exchangeGenre,
    creator: {
      id: card.photoCard.creator.id,
      nickname: card.photoCard.creator.nickname,
    },
    seller: {
      id: card.seller.id,
      nickname: card.seller.nickname,
    },
    createdAt: card.createdAt.toISOString(),
    updatedAt: card.updatedAt.toISOString(),
  };
};

export const toMarketMeResponse = (card: MarketOfferDto): MarketMeResponse => {
  const offer = card.saleCard
    ? {
        saleCardId: card.saleCard.id,
        exchangeOfferId: null,
        status: card.saleCard.status,
        name: card.saleCard.photoCard!.name,
        genre: card.saleCard.photoCard!.genre,
        grade: card.saleCard.photoCard!.grade,
        price: card.saleCard.price,
        image: card.saleCard.photoCard!.imageUrl,
        remaining:
          card.saleCard.quantity - (card.saleCard.totalTradedQuantity || 0),
        total: card.saleCard.quantity,
        creator: {
          id: card.saleCard.photoCard!.creator.id,
          nickname: card.saleCard.photoCard!.creator.nickname,
        },
      }
    : card.exchangeOffer
    ? {
        saleCardId: card.exchangeOffer.saleCard.id,
        exchangeOfferId: card.exchangeOffer.id,
        status: card.exchangeOffer.status,
        name: card.exchangeOffer.userPhotoCard.photoCard.name,
        genre: card.exchangeOffer.userPhotoCard.photoCard.genre,
        grade: card.exchangeOffer.userPhotoCard.photoCard.grade,
        price: card.exchangeOffer.userPhotoCard.photoCard.price,
        image: card.exchangeOffer.userPhotoCard.photoCard.imageUrl,
        remaining: 1,
        total: 1,
        creator: {
          id: card.exchangeOffer.userPhotoCard.photoCard.creator.id,
          nickname: card.exchangeOffer.userPhotoCard.photoCard.creator.nickname,
        },
      }
    : null;

  if (!offer)
    throw new Error(
      "Invalid MarketOfferDto: Missing saleCard or exchangeOffer"
    );

  return {
    id: card.id,
    saleCardId: offer.saleCardId,
    exchangeOfferId: offer.exchangeOfferId,
    status: offer.status,
    name: offer.name,
    genre: offer.genre,
    grade: offer.grade,
    price: offer.price,
    image: offer.image,
    remaining: offer.remaining,
    total: offer.total,
    creator: offer.creator,
    createdAt: card.createdAt.toISOString(),
    updatedAt: card.updatedAt.toISOString(),
  };
};
