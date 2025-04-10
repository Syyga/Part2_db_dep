export interface UserDto {
  id: string;
  nickname: string;
  email?: string;
  role?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
