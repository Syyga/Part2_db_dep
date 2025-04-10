import { PhotoCardDto } from "./photoCard.dto";

export interface UserPhotoCardDto {
  id: string;
  ownerId: string;
  photoCardId: string;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
  photoCard: PhotoCardDto;
}
