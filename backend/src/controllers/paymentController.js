import Order from "../models/Order.js";
import AuditLog from "../models/AuditLog.js";

// @desc    Create a payment intent for a sales order
// @route   POST /api/payments/create-intent
// @access  Private
export const createPaymentIntent = async (req, res, next) => {
  try {
    const { orderId } = req.body;
    
    const order = await Order.findById(orderId);
    if (!order || order.type !== "SALE") {
      return res.status(404).json({ success: false, message: "Sales Order not found" });
    }

    const amount = order.items.reduce((sum, item) => sum + item.quantity * item.price, 0);

    const clientSecret = `pi_mock_${order._id}_secret_${Math.random().toString(36).substring(2, 9)}`;

    res.json({
      success: true,
      clientSecret,
      amount,
      currency: "inr",
      orderNumber: order.orderNumber,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Simulate stripe webhook/payment confirmation endpoint
// @route   POST /api/payments/confirm-mock-payment
// @access  Private
export const confirmMockPayment = async (req, res, next) => {
  try {
    const { orderId, transactionId } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const amount = order.items.reduce((sum, item) => sum + item.quantity * item.price, 0);

    order.paymentStatus = "PAID";
    order.paymentDetails = {
      transactionId: transactionId || `txn_mock_${Math.random().toString(36).substring(2, 9)}`,
      gateway: "Stripe",
      amountPaid: amount,
      paidAt: new Date(),
    };

    await order.save();

    await AuditLog.create({
      action: "PAYMENT_RECEIVED",
      detail: `Payment of ${amount} received for Order ${order.orderNumber}`,
      performedBy: req.user ? req.user.name : "Stripe Webhook Sim",
    });

    res.json({
      success: true,
      message: "Payment successfully confirmed",
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Stripe Webhook handler
// @route   POST /api/payments/webhook
// @access  Public
export const stripeWebhook = async (req, res, next) => {
  let event = req.body;

  try {
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object;
      const orderId = paymentIntent.metadata.orderId;

      const order = await Order.findById(orderId);
      if (order) {
        order.paymentStatus = "PAID";
        order.paymentDetails = {
          transactionId: paymentIntent.id,
          gateway: "Stripe",
          amountPaid: paymentIntent.amount / 100,
          paidAt: new Date(),
        };
        await order.save();

        await AuditLog.create({
          action: "PAYMENT_RECEIVED",
          detail: `Stripe Webhook: Payment received for Order ${order.orderNumber}`,
          performedBy: "Stripe Webhook",
        });
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error("Stripe Webhook Error:", error.message);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
};
