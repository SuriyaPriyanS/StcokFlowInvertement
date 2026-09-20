import express from "express";
const router = express.Router();
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/categoryController.js";
import { protect, restrictTo } from "../middleware/auth.js";

router
  .route("/")
  .get(protect, getCategories)
  .post(protect, restrictTo("Admin", "Manager"), createCategory);

router
  .route("/:id")
  .put(protect, restrictTo("Admin", "Manager"), updateCategory)
  .delete(protect, restrictTo("Admin", "Manager"), deleteCategory);

export default router;
