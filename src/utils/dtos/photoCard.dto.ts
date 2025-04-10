import { UserDto } from "./user.dto";

export interface PhotoCardDto {
  id: string;
  name: string;
  genre: string;
  grade: string;
  price: number;
  description: string;
  imageUrl: string;
  createdAt: Date;
  updatedAt: Date;
  creator: UserDto;
}
