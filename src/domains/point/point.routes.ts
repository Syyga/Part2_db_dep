import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { requestHandler } from "../../utils/requestHandler";
import { getUserPoints } from "./controllers/point.controller";

const router = Router();

router.get("/", authenticate, requestHandler(getUserPoints));

export default router;
