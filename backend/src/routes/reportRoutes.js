import express from "express";
const router = express.Router();
import {
  getInventoryReport,
  getSalesReport,
  getPurchaseReport,
  getMovementReport,
  getDashboardStats,
} from "../controllers/reportController.js";
import { protect, restrictTo } from "../middleware/auth.js";

router.get("/dashboard-stats", protect, getDashboardStats);

router.get("/inventory", protect, restrictTo("Admin", "Manager"), getInventoryReport);
router.get("/sales", protect, restrictTo("Admin", "Manager"), getSalesReport);
router.get("/purchase", protect, restrictTo("Admin", "Manager"), getPurchaseReport);
router.get("/movement", protect, restrictTo("Admin", "Manager"), getMovementReport);

export default router;
