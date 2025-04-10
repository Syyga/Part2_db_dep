import { Router } from "express";
import {
  getMe,
  login,
  refreshAccessToken,
  signup,
} from "./controllers/auth.controller";
import { requestHandler } from "../../utils/requestHandler";
import { authenticate } from "../../middlewares/auth.middleware";
const router = Router();

router.post("/signup", requestHandler(signup));
router.post("/login", requestHandler(login));
router.post("/refresh", requestHandler(refreshAccessToken));
router.get("/me", authenticate, requestHandler(getMe));

export default router;
