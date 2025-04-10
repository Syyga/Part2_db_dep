import { ExchangeOfferDto } from "./exchangeOffer.dto";
import { saleCardDto } from "./saleCard.dto";

export interface MarketOfferDto {
  id: string;
  type: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  saleCardId: string | null;
  exchangeOfferId: string | null;
  saleCard: saleCardDto | null;
  exchangeOffer: ExchangeOfferDto | null;
}
