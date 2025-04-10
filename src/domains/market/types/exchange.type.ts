import { z } from "zod";
import { RequestCreateExchangeOfferSchema } from "../validators/exchange.validator";

export type CreateExchangeOfferRequest = z.infer<
  typeof RequestCreateExchangeOfferSchema
>;

export type CreateExchangeOffer = (
  body: CreateExchangeOfferRequest,
  userId: string
) => Promise<{ message: string }>;
