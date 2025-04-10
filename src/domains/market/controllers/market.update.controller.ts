import { Request, Response } from "express";
import marketUpdateService from "../services/market.update.services";
import { UpdateMarketItemRequest } from "../types/market.update.types";

// 공통 오류 처리 함수
const handleError = (res: Response, error: any, defaultMessage: string) => {
  res.status(error.statusCode || 500).json({
    error: error.message || defaultMessage,
  });
};

// 판매 등록한 포토카드 수정
export const updateMarketItemCtrl = async (req: Request, res: Response) => {
  try {
    const { id: saleCardId } = req.params;
    const body = req.body as UpdateMarketItemRequest;
    const userId = req.user!.id;

    // 최소한 하나 이상의 필드가 제공되었는지 확인
    if (
      body.quantity === undefined &&
      body.price === undefined &&
      body.exchangeOffer === undefined
    ) {
      res.status(400).json({
        error:
          "최소한 하나 이상의 필드가 필요합니다 (quantity, price, exchangeOffer)",
      });
      return;
    }

    const result = await marketUpdateService.updateMarketItem(
      saleCardId,
      body,
      userId
    );
    res.status(201).json(result);
  } catch (error: any) {
    handleError(res, error, "포토카드 수정 중 오류가 발생했습니다.");
  }
};

// 판매 등록한 포토카드 취소
export const cancelMarketItemCtrl = async (req: Request, res: Response) => {
  try {
    const { id: saleCardId } = req.params;
    const userId = req.user!.id;

    const result = await marketUpdateService.cancelMarketItem(
      saleCardId,
      userId
    );
    res.status(201).json(result);
  } catch (error: any) {
    handleError(res, error, "포토카드 판매 취소 중 오류가 발생했습니다.");
  }
};

export default {
  updateMarketItemCtrl,
  cancelMarketItemCtrl,
};
