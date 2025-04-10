import { z } from "zod";

export const MarketListQuerySchema = z.object({
  keyword: z.string().optional(),
  grade: z.enum(["COMMON", "RARE", "SUPER_RARE", "LEGENDARY"]).optional(),
  genre: z.enum(["LANDSCAPE", "PORTRAIT", "TRAVEL", "OBJECT"]).optional(),
  status: z.enum(["ON_SALE", "SOLD_OUT", "CANCELED"]).optional(),
  sort: z.enum(["recent", "old", "cheap", "expensive"]).optional(),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : undefined)),
  cursor: z.object({ id: z.string(), createdAt: z.string() }).optional(),
});

export const MarketMeQuerySchema = z.object({
  keyword: z.string().optional(),
  grade: z.enum(["COMMON", "RARE", "SUPER_RARE", "LEGENDARY"]).optional(),
  genre: z.enum(["LANDSCAPE", "PORTRAIT", "TRAVEL", "OBJECT"]).optional(),
  status: z.enum(["ON_SALE", "SOLD_OUT", "PENDING"]).optional(),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : undefined)),
  cursor: z.object({ id: z.string(), createdAt: z.string() }).optional(),
});

export const MarketListCountQuerySchema = z.object({
  grade: z.enum(["COMMON", "RARE", "SUPER_RARE", "LEGENDARY"]).optional(),
  genre: z.enum(["LANDSCAPE", "PORTRAIT", "TRAVEL", "OBJECT"]).optional(),
  status: z.enum(["ON_SALE", "SOLD_OUT", "PENDING"]).optional(),
});

export const RequestMarketItemSchema = z.object({
  userPhotoCardId: z.string(),
  quantity: z.number().min(1),
  price: z.number().min(1),
  exchangeOffer: z
    .object({
      grade: z.string(),
      genre: z.string(),
      description: z.string(),
    })
    .optional(),
});

export const RequestPurchaseMarketItemSchema = z.object({
  saleCardId: z.string(),
  quantity: z.number().min(1),
});
