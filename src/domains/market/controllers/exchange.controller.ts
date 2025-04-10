import { Request, Response } from "express";
import { failOffer, acceptOffer } from "../services/exchange.service";
import { CustomError } from "../../../utils/errors";
import { ApiSignature } from "../../../types";
import exchangeService from "../services/exchange.service";

export const createExchangeOffer: ApiSignature = async (req, res) => {
  const userId = req.user.id;
  const body = req.body;

  const response = await exchangeService.createExchangeOffer(body, userId);

  res.status(200).send(response);
};

export const failOfferController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    // 사용자 인증 확인
    if (!req.user) {
      res.status(401).json({ message: "인증이 필요합니다." });
      return;
    }
    const userId = req.user.id;

    const response = await failOffer(id, userId);

    res.status(200).json(response);
  } catch (error: any) {
    console.error("Exchange fail error:", error);
    if (error instanceof CustomError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Failed to fail exchange offer" });
    }
  }
};

export const acceptOfferController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    // 사용자 인증 확인
    if (!req.user) {
      res.status(401).json({ message: "인증이 필요합니다." });
      return;
    }
    const userId = req.user.id;

    const response = await acceptOffer(id, userId);

    res.status(200).json(response);
  } catch (error: any) {
    console.error("Exchange accept error:", error);
    if (error instanceof CustomError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Failed to accept exchange offer" });
    }
  }
};
