export type ExchangeStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "FAILED";

export interface ExchangeOffer {
  id: string;
  saleCardId: string;
  offererId: string;
  userPhotoCardId: string;
  status: string;
  content: String;
  createdAt: Date;
  updatedAt: Date;
}
