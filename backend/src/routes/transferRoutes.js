import express from "express";
const router = express.Router();
import {
  getTransfers,
  createTransfer,
  dispatchTransfer,
  receiveTransfer,
} from "../controllers/transferController.js";
import { protect, restrictTo } from "../middleware/auth.js";

router
  .route("/")
  .get(protect, getTransfers)
  .post(protect, restrictTo("Admin", "Manager", "Inventory Staff"), createTransfer);

router.put("/:id/dispatch", protect, restrictTo("Admin", "Manager", "Inventory Staff"), dispatchTransfer);
router.put("/:id/receive", protect, restrictTo("Admin", "Manager", "Inventory Staff"), receiveTransfer);

export default router;
