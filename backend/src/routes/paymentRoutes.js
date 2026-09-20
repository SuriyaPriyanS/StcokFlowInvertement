import express from "express";
const router = express.Router();
import {
  createPaymentIntent,
  confirmMockPayment,
  stripeWebhook,
} from "../controllers/paymentController.js";
import { protect } from "../middleware/auth.js";

router.post("/create-intent", protect, createPaymentIntent);
router.post("/confirm-mock-payment", protect, confirmMockPayment);
router.post("/webhook", stripeWebhook);

export default router;
