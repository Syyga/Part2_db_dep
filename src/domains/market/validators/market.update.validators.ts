import { z } from "zod";

// 포토카드 수정을 위한 검증 스키마
export const UpdateMarketItemSchema = z.object({
  quantity: z.number().min(1).optional(),
  price: z.number().min(0).optional(),
  exchangeOffer: z
    .object({
      grade: z.enum(["COMMON", "RARE", "SUPER_RARE", "LEGENDARY"]),
      genre: z.enum(["LANDSCAPE", "PORTRAIT", "TRAVEL", "OBJECT"]),
      description: z.string(),
    })
    .optional(),
});
