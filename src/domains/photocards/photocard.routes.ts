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
  authenticate,
  validateAll({ body: CreatePhotocardSchema }),
  requestHandler(createPhotocard)
);

//내 포토카드 상세조회
router.get("/me/:id", authenticate, requestHandler(getMyPhotocardsDetail));

export default router;
