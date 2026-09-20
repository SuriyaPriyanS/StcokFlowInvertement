import express from "express";
const router = express.Router();
import {
  getAuditLogs,
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword,
  getSystemStats,
} from "../controllers/settingsController.js";
import { protect, restrictTo } from "../middleware/auth.js";

// System stats & audit logs (Admin only)
router.get("/stats", protect, restrictTo("Admin"), getSystemStats);
router.get("/audit-logs", protect, restrictTo("Admin"), getAuditLogs);

// User management endpoints (Admin only)
router.get("/users", protect, restrictTo("Admin"), getUsers);
router.post("/users", protect, restrictTo("Admin"), createUser);
router.put("/users/:id", protect, restrictTo("Admin"), updateUser);
router.delete("/users/:id", protect, restrictTo("Admin"), deleteUser);
router.put("/users/:id/password", protect, restrictTo("Admin"), resetUserPassword);

export default router;
