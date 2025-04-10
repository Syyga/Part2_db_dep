import { Router } from "express";
import authRoutes from "./auth/auth.routes";
import marketRoutes from "./market/market.routes";
import notificationRoutes from "./notification/notification.routes";
import photocardRoutes from "./photocards/photocard.routes";
import randomBoxRoutes from "./random-box/random-box.routes";
import pointRoutes from "./point/point.routes";

const router = Router();
router.use("/auth", authRoutes);
router.use("/market", marketRoutes);
router.use("/notifications", notificationRoutes);
router.use("/photocards", photocardRoutes);
router.use("/random-box", randomBoxRoutes);
router.use("/point", pointRoutes);

export default router;
