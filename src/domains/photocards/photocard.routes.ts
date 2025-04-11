import { Router } from "express";
import {
  getMyPhotocards,
  getMyPhotocardsCount,
  createPhotocard,
  getMyPhotocardsDetail,
} from "./controllers/photocard.controller";
import { requestHandler } from "../../utils/requestHandler";
import { validateAll } from "../../middlewares/validator.middleware";
import {
  PhotocardsQuerySchema,
  CreatePhotocardSchema,
} from "./validators/photocard.validator";
import { authenticate } from "../../middlewares/auth.middleware";
import { upload } from "../../middlewares/upload.middleware";

const router = Router();

router.get(
  "/me",
  authenticate,
  validateAll({ query: PhotocardsQuerySchema }),
  requestHandler(getMyPhotocards)
);

router.get("/me/count", authenticate, requestHandler(getMyPhotocardsCount));

// 포토카드 생성 라우트
router.post(
  "/",
  upload.single("image"), // 파일 업로드 (req.file 생성)
  authenticate, // 인증 미들웨어
  validateAll({ body: CreatePhotocardSchema }), // body 유효성 검사
  requestHandler(createPhotocard) // 실제 서비스 실행
);

//내 포토카드 상세조회
router.get("/me/:id", authenticate, requestHandler(getMyPhotocardsDetail));

export default router;
