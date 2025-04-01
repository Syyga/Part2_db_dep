import { Request, Response } from "express";
import { RequestWithUser } from "../interfaces/requestWithUser";
import * as notificationService from "../services/notificationService";

// 알림 조회 요청 처리
export const getNotifications = async (
  req: RequestWithUser,
  res: Response
): Promise<void> => {
  const userId = req.user.id;

  try {
    const notifications = await notificationService.getUserNotifications(
      userId
    );
    res.status(200).json({ notifications });
    return;
  } catch (error) {
    res.status(500).json({ message: "서버 오류", error });
    return;
  }
};

//알림 열람 처리
export const readNotification = async (
  req: RequestWithUser,
  res: Response
): Promise<void> => {
  const userId = req.user.id;
  const { notificationId } = req.params; // URL 파라미터에서 알림 ID 가져오기

  try {
    const updated = await notificationService.markNotificationAsRead(
      userId,
      notificationId
    );
    res.status(200).json({ message: "읽음 처리 완료", updated });
    return;
  } catch (error) {
    res.status(404).json({ message: "음.. 알 수 없는 에러다", error });
    return;
  }
};

export const createNotificationController = async (
  req: RequestWithUser,
  res: Response
): Promise<void> => {
  const userId = req.user.id;

  const { type, message } = req.body; // 알림 타입과 메시지

  const result = await notificationService.createNotification({
    userId,
    message,
  });
  if (!result) {
    res.status(500).json({
      message: "알림 생성 실패",
    });
    return;
  }

  res.status(201).json({
    message: "알림 생성 완료",
  });
  return;
};
