import { CustomError } from "../../../utils/errors";
import prisma from "../../../utils/prismaClient";
import { GetUserPoints } from "../types/point.type";

const getUserPoints: GetUserPoints = async (userId: string) => {
  const userPoint = await prisma.point.findUnique({
    where: { userId },
    select: { points: true },
  });
  if (!userPoint) {
    throw new CustomError("해당 사용자에 대한 포인트 정보가 없습니다", 404);
  }
  const { points } = userPoint;

  return { points };
};

const pointService = {
  getUserPoints,
};

export default pointService;
