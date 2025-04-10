import { PhotoCardDto } from "./photoCard.dto";
import { UserDto } from "./user.dto";
import { UserPhotoCardDto } from "./userPhotoCard.dto";

export interface saleCardDto {
  id: string;
  quantity: number;
  price: number;
  status: string;
  exchangeDescription: string;
  exchangeGrade: string;
  exchangeGenre: string;
  createdAt: Date; // ISO string이므로 Date로 쓸 수도 있음
  updatedAt: Date;
  totalTradedQuantity?: number;
  seller?: UserDto;
  photoCard?: PhotoCardDto;
  userPhotoCard?: UserPhotoCardDto;
}
