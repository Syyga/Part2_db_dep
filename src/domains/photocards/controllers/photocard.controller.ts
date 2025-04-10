import { Request, Response, NextFunction } from "express";
import photocardService from "../services/photocard.service";
import { MyPhotocardsQuery } from "../types/photocard.type";

/**
 * 사용자의 포토카드 목록 조회
 * GET /api/photocards/me
 */
export const getMyPhotocards = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({
      message: "로그인이 필요합니다.",
    });
    return;
  }

  const query = req.query as unknown as MyPhotocardsQuery;

  return photocardService
    .getMyPhotocards(userId, query)
    .then((result) => {
      res.status(200).json(result);
    })
    .catch(next);
};

/**
 * 필터 옵션별 포토카드 개수 조회
 * GET /api/photocards/me/count
 */
export const getMyPhotocardsCount = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({
      message: "로그인이 필요합니다.",
    });
    return;
  }

  const { grade, genre } = req.query as { grade?: string; genre?: string };

  return photocardService
    .getMyPhotocardsCount(userId, { grade, genre })
    .then((result) => {
      res.status(200).json({
        grade: grade || "",
        genre: genre || "",
        count: result,
      });
    })
    .catch(next);
};

/**
 * 포토카드 생성 컨트롤러
 * POST /api/photocards
 */
export const createPhotocard = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // 사용자 ID 확인
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        message: "인증이 필요합니다.",
      });
      return;
    }

    // 유효성 검사는 미들웨어에서 이미 완료됨
    // 포토카드 생성
    const photocard = await photocardService.createPhotocard(
      req.body,
      req.body.imageUrl,
      userId
    );

    res.status(201).json({
      message: "포토카드가 성공적으로 생성되었습니다.",
      data: photocard,
    });
  } catch (error) {
    console.error("포토카드 생성 중 오류 발생:", error);
    res.status(500).json({
      message: "포토카드 생성에 실패했습니다.",
    });
  }
};

/**
 * 내 포토 카드 상세조회
 * GET /api/photocards/me/:id
 */
export const getMyPhotocardsDetail = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = req.user?.id;
  const photocardId = req.params.id;

  if (!userId) {
    res.status(401).json({ message: "you should login" });
    return;
  }

  if (!photocardId) {
    res.status(400).json({ message: "photocardId is required" });
    return;
  }

  return photocardService
    .getMyPhotoCardDetailService(userId, photocardId)
    .then((result) => {
      res.status(200).json(result);
    })
    .catch((error) => {
      next(error);
    });
};

export default {
  getMyPhotocards,
  getMyPhotocardsCount,
  createPhotocard,
  getMyPhotocardsDetail,
};
