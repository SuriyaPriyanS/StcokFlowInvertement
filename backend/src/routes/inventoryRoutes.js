import express from "express";
const router = express.Router();
import {
  getInventory,
  adjustStock,
  importStockBatch,
  getStockUpdateRequests,
  approveStockUpdateRequest,
  rejectStockUpdateRequest,
} from "../controllers/inventoryController.js";
import { protect, restrictTo } from "../middleware/auth.js";

router.get("/", protect, getInventory);
router.post("/adjust", protect, restrictTo("Admin", "Manager", "Inventory Staff"), adjustStock);
router.post("/import", protect, restrictTo("Admin", "Manager", "Inventory Staff"), importStockBatch);

// Stock Approval & Requests Routes
router.get("/requests", protect, restrictTo("Admin", "Manager", "Inventory Staff"), getStockUpdateRequests);
router.put("/requests/:id/approve", protect, restrictTo("Admin"), approveStockUpdateRequest);
router.put("/requests/:id/reject", protect, restrictTo("Admin"), rejectStockUpdateRequest);

export default router;
