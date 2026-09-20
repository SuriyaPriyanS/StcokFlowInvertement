import express from "express";
const router = express.Router();
import { register, login, getMe, getDemoUsers } from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";

router.post("/register", register);
router.post("/login", login);
router.get("/demo-users", getDemoUsers);
router.get("/me", protect, getMe);

export default router;
