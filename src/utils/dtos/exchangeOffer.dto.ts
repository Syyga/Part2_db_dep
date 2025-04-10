import { saleCardDto } from "./saleCard.dto";
import { UserPhotoCardDto } from "./userPhotoCard.dto";

export interface ExchangeOfferDto {
  id: string;
  offererId: string;
  userPhotoCardId: string;
  status: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  saleCard: saleCardDto;
  userPhotoCard: UserPhotoCardDto;
}
