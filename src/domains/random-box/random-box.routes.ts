import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { RequestHandler } from "express";
import { requestHandler } from "../../utils/requestHandler";
import { openBox, testOpenBox } from "./controllers/random-box.contreller";
import { status } from "./controllers/random-box.contreller";

const router = Router();

router.get("/", authenticate, requestHandler(status));

router.post("/", authenticate, requestHandler(openBox));
router.post("/test", authenticate, requestHandler(testOpenBox)); // 테스트용 코드 ( 시간 제한 X )
export default router;
