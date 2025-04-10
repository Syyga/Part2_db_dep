import { PrismaClient } from "@prisma/client";
import { CreateNotificationInput } from "../interfaces/requestWithUser";

const prisma = new PrismaClient();

// 알림 조회 로직
export const getUserNotifications = async (
  userId: string,
  limit?: number,
  cursor?: string
) => {
  console.log("userId", userId);
  return await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },

    take: limit,
    ...(cursor
      ? {
          skip: 1,
          cursor: { id: cursor },
        }
      : {}),
  });
};

// 알림 읽음 처리 로직
export const markNotificationAsRead = async (
  userId: string,
  notificationId: string
) => {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId, userId },
  });

  if (!notification || notification.userId !== userId) {
    throw new Error("알림을 찾을 수 없거나 권한이 없습니다.");
  }

  return await prisma.notification.update({
    where: { id: notificationId },
    data: { readAt: new Date() },
  });
};

// 알림 생성 로직
export const createNotification = async (input: CreateNotificationInput) => {
  const { userId, message } = input;
  return await prisma.notification.create({
    data: {
      userId,
      message,
    },
  });
};
