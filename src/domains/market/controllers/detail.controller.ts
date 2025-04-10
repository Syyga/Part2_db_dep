import { Request, Response, NextFunction } from "express";
import { getBasicDetail, getExchangeDetail } from "../services/detail.service";

/**
 * 마켓플레이스 기본 상세 정보 조회
 * GET /api/market/:id/detail
 */
export const getBasicDetailCtrl = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    console.log(`마켓 아이템 상세 정보 조회 요청: ${id}`);

    if (!req.user) {
      res.status(401).json({ message: "인증이 필요합니다." });
      return;
    }
    const userId = req.user.id;
    console.log(`요청한 사용자 ID: ${userId}`);

    const response = await getBasicDetail(id, userId);
    res.json(response);
  } catch (error: any) {
    console.error("마켓 아이템 기본 정보 조회 실패:", error);
    res.status(500).json({
      message:
        error.message || "마켓 아이템 기본 정보 조회 중 오류가 발생했습니다.",
    });
  }
};

/**
 * 마켓플레이스 교환 제안 정보 조회
 * GET /api/market/:id/exchange
 */
export const getExchangeCtrl = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    console.log(`마켓 아이템 교환 제안 정보 조회 요청: ${id}`);

    if (!req.user) {
      res.status(401).json({ message: "인증이 필요합니다." });
      return;
    }
    const userId = req.user.id;
    console.log(`요청한 사용자 ID: ${userId}`);

    const response = await getExchangeDetail(id, userId);
    res.json(response);
  } catch (error: any) {
    console.error("마켓 아이템 교환 제안 정보 조회 실패:", error);
    res.status(500).json({
      message:
        error.message ||
        "마켓 아이템 교환 제안 정보 조회 중 오류가 발생했습니다.",
    });
  }
};

// 라우터에서 참조하는 이름 유지
export default {
  getMarketItemBasicDetail: getBasicDetailCtrl,
  getMarketItemExchange: getExchangeCtrl,
};
