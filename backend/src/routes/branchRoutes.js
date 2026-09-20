import express from "express";
const router = express.Router();
import {
  getBranches,
  createBranch,
  updateBranch,
  deleteBranch,
} from "../controllers/branchController.js";
import { protect, restrictTo } from "../middleware/auth.js";

router
  .route("/")
  .get(protect, getBranches)
  .post(protect, restrictTo("Admin", "Manager"), createBranch);

router
  .route("/:id")
  .put(protect, restrictTo("Admin", "Manager"), updateBranch)
  .delete(protect, restrictTo("Admin"), deleteBranch);

export default router;
