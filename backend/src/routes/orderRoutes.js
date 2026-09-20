import express from "express";
const router = express.Router();
import {
  getOrders,
  createPurchaseOrder,
  approvePurchaseOrder,
  receivePurchaseOrder,
  createSalesOrder,
  confirmSalesOrder,
  cancelSalesOrder,
} from "../controllers/orderController.js";
import { protect, restrictTo } from "../middleware/auth.js";

router.get("/", protect, getOrders);

// Purchase Orders
router.post("/purchase", protect, restrictTo("Admin", "Manager"), createPurchaseOrder);
router.put("/purchase/:id/approve", protect, restrictTo("Admin", "Manager"), approvePurchaseOrder);
router.put("/purchase/:id/receive", protect, restrictTo("Admin", "Manager", "Inventory Staff"), receivePurchaseOrder);

// Sales Orders
router.post("/sales", protect, restrictTo("Admin", "Manager", "Sales Staff"), createSalesOrder);
router.put("/sales/:id/confirm", protect, restrictTo("Admin", "Manager", "Sales Staff"), confirmSalesOrder);
router.put("/sales/:id/cancel", protect, restrictTo("Admin", "Manager", "Sales Staff"), cancelSalesOrder);

export default router;
