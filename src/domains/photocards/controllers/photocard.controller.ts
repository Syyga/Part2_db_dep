import { Request, Response, NextFunction } from "express";
import photocardService from "../services/photocard.service";
import { MyPhotocardsQuery } from "../types/photocard.type";
import { ApiSignature } from "../../../types";
import { CustomError } from "../../../utils/errors";
import { uploadToCloudinary } from "../../../utils/uploadToCloudinary";

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
export const createPhotocard: ApiSignature = async (req, res) => {
  const userId = req.user.id;
  const body = req.body;
  const file = req.file; // multer가 넣어준 파일 정보

  if (!file) {
    throw new CustomError("이미지 파일이 필요합니다.", 400);
  }

  // file을 cloudinary에 업로드
  const { imageUrl, publicId } = await uploadToCloudinary(file.buffer);
  console.log("imageUrl: ", imageUrl);

  const response = await photocardService.createPhotocard(
    body,
    imageUrl,
    publicId,
    userId
  );

  res.status(201).send(response);
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
