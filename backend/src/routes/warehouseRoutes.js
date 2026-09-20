import express from "express";
const router = express.Router();
import {
  getWarehouses,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
} from "../controllers/warehouseController.js";
import { protect, restrictTo } from "../middleware/auth.js";

router
  .route("/")
  .get(protect, getWarehouses)
  .post(protect, restrictTo("Admin", "Manager"), createWarehouse);

router
  .route("/:id")
  .put(protect, restrictTo("Admin", "Manager"), updateWarehouse)
  .delete(protect, restrictTo("Admin"), deleteWarehouse);

export default router;
