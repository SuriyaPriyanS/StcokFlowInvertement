import mongoose from "mongoose";
import Order from "../models/Order.js";
import Inventory from "../models/Inventory.js";
import Product from "../models/Product.js";
import StockTransaction from "../models/StockTransaction.js";
import AuditLog from "../models/AuditLog.js";

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private
export const getOrders = async (req, res, next) => {
  try {
    const { type } = req.query;
    const filter = {};
    if (type) {
      filter.type = type;
    }

    const orders = await Order.find(filter)
      .populate("party", "name email phone type")
      .populate("warehouse", "name location")
      .populate("items.product", "name sku costPrice sellingPrice tax");

    res.json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new Purchase Order
// @route   POST /api/orders/purchase
// @access  Private (Admin, Manager)
export const createPurchaseOrder = async (req, res, next) => {
  try {
    const { supplier, warehouse, items } = req.body;

    if (!supplier || !warehouse || !items || items.length === 0) {
      return res.status(400).json({ success: false, message: "Invalid purchase order payload" });
    }

    const count = await Order.countDocuments({ type: "PURCHASE" });
    const poNumber = `PO-2026-${String(count + 1).padStart(4, "0")}`;

    const order = await Order.create({
      orderNumber: poNumber,
      type: "PURCHASE",
      party: supplier,
      warehouse,
      items: items.map((it) => ({
        product: it.product,
        quantity: parseInt(it.quantity, 10),
        price: parseFloat(it.price),
      })),
      status: "PENDING",
    });

    await AuditLog.create({
      action: "PO_CREATED",
      detail: `Purchase Order ${poNumber} created`,
      performedBy: req.user.name,
    });

    res.status(201).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve a Purchase Order
// @route   PUT /api/orders/purchase/:id/approve
// @access  Private (Admin, Manager)
export const approvePurchaseOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order || order.type !== "PURCHASE") {
      return res.status(404).json({ success: false, message: "Purchase Order not found" });
    }

    if (order.status !== "PENDING") {
      return res.status(400).json({ success: false, message: `Cannot approve order in ${order.status} state` });
    }

    order.status = "APPROVED";
    await order.save();

    await AuditLog.create({
      action: "PO_APPROVED",
      detail: `Purchase Order ${order.orderNumber} approved`,
      performedBy: req.user.name,
    });

    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

// @desc    Receive goods for an approved Purchase Order
// @route   PUT /api/orders/purchase/:id/receive
// @access  Private (Admin, Manager, Inventory Staff)
export const receivePurchaseOrder = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findById(req.params.id).session(session);
    if (!order || order.type !== "PURCHASE") {
      return res.status(404).json({ success: false, message: "Purchase order not found" });
    }

    if (order.status !== "APPROVED") {
      return res.status(400).json({ success: false, message: `Only APPROVED purchase orders can be received (current status: ${order.status})` });
    }

    for (const it of order.items) {
      let inv = await Inventory.findOne({ productId: it.product, warehouseId: order.warehouse }).session(session);
      if (!inv) {
        inv = new Inventory({
          productId: it.product,
          warehouseId: order.warehouse,
          quantity: 0,
          reserved: 0,
        });
      }

      const prevQty = inv.quantity;
      inv.quantity = prevQty + it.quantity;
      await inv.save({ session });

      await StockTransaction.create(
        [
          {
            product: it.product,
            warehouse: order.warehouse,
            type: "PURCHASE",
            quantity: it.quantity,
            previousQuantity: prevQty,
            newQuantity: inv.quantity,
            referenceId: order.orderNumber,
            performedBy: req.user.name,
          },
        ],
        { session }
      );
    }

    order.status = "RECEIVED";
    await order.save({ session });

    await AuditLog.create(
      [
        {
          action: "PO_RECEIVED",
          detail: `Goods received for Purchase Order ${order.orderNumber}. Inventory updated.`,
          performedBy: req.user.name,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.json({ success: true, message: "Goods received successfully. Stock levels updated.", data: order });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

// @desc    Create a new Sales Order
// @route   POST /api/orders/sales
// @access  Private (Admin, Manager, Sales Staff)
export const createSalesOrder = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { customer, warehouse, items } = req.body;

    if (!customer || !warehouse || !items || items.length === 0) {
      return res.status(400).json({ success: false, message: "Invalid sales order payload" });
    }

    const count = await Order.countDocuments({ type: "SALE" });
    const soNumber = `SO-2026-${String(count + 11).padStart(4, "0")}`;

    for (const it of items) {
      let inv = await Inventory.findOne({ productId: it.product, warehouseId: warehouse }).session(session);
      if (!inv) {
        inv = new Inventory({
          productId: it.product,
          warehouseId: warehouse,
          quantity: 0,
          reserved: 0,
        });
      }
      inv.reserved += parseInt(it.quantity, 10);
      await inv.save({ session });
    }

    const order = await Order.create(
      [
        {
          orderNumber: soNumber,
          type: "SALE",
          party: customer,
          warehouse,
          items: items.map((it) => ({
            product: it.product,
            quantity: parseInt(it.quantity, 10),
            price: parseFloat(it.price),
          })),
          status: "PENDING",
        },
      ],
      { session }
    );

    await AuditLog.create(
      [
        {
          action: "SO_CREATED",
          detail: `Sales Order ${soNumber} created (Stock reserved)`,
          performedBy: req.user.name,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ success: true, data: order[0] });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

// @desc    Confirm a Sales Order
// @route   PUT /api/orders/sales/:id/confirm
// @access  Private (Admin, Manager, Sales Staff)
export const confirmSalesOrder = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findById(req.params.id).session(session);
    if (!order || order.type !== "SALE") {
      return res.status(404).json({ success: false, message: "Sales order not found" });
    }

    if (order.status !== "PENDING") {
      return res.status(400).json({ success: false, message: `Only pending sales orders can be confirmed (current status: ${order.status})` });
    }

    for (const it of order.items) {
      const inv = await Inventory.findOne({ productId: it.product, warehouseId: order.warehouse }).session(session);
      if (!inv || inv.quantity < it.quantity) {
        await AuditLog.create(
          [
            {
              action: "SO_CONFIRM_FAILED",
              detail: `Confirmation failed for ${order.orderNumber}: Insufficient physical stock for product ${it.product}`,
              performedBy: req.user.name,
            },
          ],
          { session }
        );

        await session.commitTransaction();
        session.endSession();

        return res.status(400).json({
          success: false,
          message: `Insufficient stock for product ${it.product}. Confirmation cancelled.`,
        });
      }
    }

    for (const it of order.items) {
      const inv = await Inventory.findOne({ productId: it.product, warehouseId: order.warehouse }).session(session);
      const prevQty = inv.quantity;
      
      inv.quantity = prevQty - it.quantity;
      inv.reserved = Math.max(0, inv.reserved - it.quantity);
      await inv.save({ session });

      await StockTransaction.create(
        [
          {
            product: it.product,
            warehouse: order.warehouse,
            type: "SALE",
            quantity: it.quantity,
            previousQuantity: prevQty,
            newQuantity: inv.quantity,
            referenceId: order.orderNumber,
            performedBy: req.user.name,
          },
        ],
        { session }
      );
    }

    order.status = "CONFIRMED";
    await order.save({ session });

    await AuditLog.create(
      [
        {
          action: "SO_CONFIRMED",
          detail: `Sales Order ${order.orderNumber} confirmed. Inventory reduced.`,
          performedBy: req.user.name,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.json({ success: true, message: "Sales Order confirmed successfully.", data: order });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

// @desc    Cancel a Sales Order
// @route   PUT /api/orders/sales/:id/cancel
// @access  Private (Admin, Manager, Sales Staff)
export const cancelSalesOrder = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findById(req.params.id).session(session);
    if (!order || order.type !== "SALE") {
      return res.status(404).json({ success: false, message: "Sales order not found" });
    }

    if (order.status !== "PENDING") {
      return res.status(400).json({ success: false, message: `Only PENDING orders can be cancelled (current status: ${order.status})` });
    }

    for (const it of order.items) {
      const inv = await Inventory.findOne({ productId: it.product, warehouseId: order.warehouse }).session(session);
      if (inv) {
        inv.reserved = Math.max(0, inv.reserved - it.quantity);
        await inv.save({ session });
      }
    }

    order.status = "CANCELLED";
    await order.save({ session });

    await AuditLog.create(
      [
        {
          action: "SO_CANCELLED",
          detail: `Sales Order ${order.orderNumber} cancelled. Reservations released.`,
          performedBy: req.user.name,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.json({ success: true, message: "Sales Order cancelled. Reservations released.", data: order });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};
