import express from "express";
const router = express.Router();
import {
  getParties,
  createParty,
  updateParty,
  deleteParty,
} from "../controllers/partyController.js";
import { protect, restrictTo } from "../middleware/auth.js";

router
  .route("/")
  .get(protect, getParties)
  .post(protect, restrictTo("Admin", "Manager", "Sales Staff"), createParty);

router
  .route("/:id")
  .put(protect, restrictTo("Admin", "Manager", "Sales Staff"), updateParty)
  .delete(protect, restrictTo("Admin", "Manager"), deleteParty);

export default router;
