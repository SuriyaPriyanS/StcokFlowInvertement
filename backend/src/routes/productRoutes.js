import express from "express";
const router = express.Router();
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/productController.js";
import { protect, restrictTo } from "../middleware/auth.js";
import { upload } from "../services/uploadService.js";

router
  .route("/")
  .get(protect, getProducts)
  .post(protect, restrictTo("Admin", "Manager"), upload.array("images", 5), createProduct);

router
  .route("/:id")
  .get(protect, getProductById)
  .put(protect, restrictTo("Admin", "Manager"), upload.array("images", 5), updateProduct)
  .delete(protect, restrictTo("Admin"), deleteProduct);

export default router;
