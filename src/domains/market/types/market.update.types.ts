import { z } from "zod";
import { UpdateMarketItemSchema } from "../validators/market.update.validators";

// 검증 스키마로부터 타입 추론
export type UpdateMarketItemRequest = z.infer<typeof UpdateMarketItemSchema>;

// 서비스 함수 타입 정의
export type UpdateMarketItem = (
  saleCardId: string,
  body: UpdateMarketItemRequest,
  userId: string
) => Promise<MarketItemResponse>;

export type CancelMarketItem = (
  saleCardId: string,
  userId: string
) => Promise<MarketItemResponse>;

// 응답 타입 정의
export type MarketItemResponse = {
  saleCardId: string;
  userPhotoCardId: string;
  status: string;
  name: string;
  genre: string;
  grade: string;
  price: number;
  image: string;
  remaining: number;
  total: number;
  createdAt: string;
  updatedAt: string;
  creator: {
    id: string;
    nickname: string;
  };
  exchangeOffer: {
    description: string;
    grade: string;
    genre: string;
  };
};
