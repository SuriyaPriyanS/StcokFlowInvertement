import express from "express";
const router = express.Router();
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getLowStockSummary,
} from "../controllers/notificationController.js";
import { protect } from "../middleware/auth.js";

router.get("/", protect, getNotifications);
router.put("/read-all", protect, markAllNotificationsAsRead);
router.put("/:id/read", protect, markNotificationAsRead);
router.get("/low-stock-summary", protect, getLowStockSummary);

export default router;
