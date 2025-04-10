import { z } from "zod";

export const RequestCreateExchangeOfferSchema = z.object({
  saleCardId: z.string(), // 판매카드 id
  offeredUserCardId: z.string(), // 제안한 카드 id
  content: z.string().min(1), // 제안 내용
});
