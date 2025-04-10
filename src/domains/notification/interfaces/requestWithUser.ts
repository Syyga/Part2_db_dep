import { Request } from "express";

export interface RequestWithUser extends Request {
  user: { id: string; role: string };
}

export interface CreateNotificationInput {
  userId: string;
  message: string;
}
