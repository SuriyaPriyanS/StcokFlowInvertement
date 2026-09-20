import mongoose from "mongoose";
import Transfer from "../models/Transfer.js";
import Inventory from "../models/Inventory.js";
import Product from "../models/Product.js";
import StockTransaction from "../models/StockTransaction.js";
import AuditLog from "../models/AuditLog.js";

// @desc    Get all stock transfers
// @route   GET /api/transfers
// @access  Private
export const getTransfers = async (req, res, next) => {
  try {
    const transfers = await Transfer.find({})
      .populate("product", "name sku brand unit costPrice")
      .populate("fromWarehouse", "name location")
      .populate("toWarehouse", "name location");

    res.json({ success: true, count: transfers.length, data: transfers });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new Stock Transfer
// @route   POST /api/transfers
// @access  Private (Admin, Manager, Inventory Staff)
export const createTransfer = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { fromWarehouse, toWarehouse, product, quantity } = req.body;

    if (!fromWarehouse || !toWarehouse || !product || !quantity) {
      return res.status(400).json({ success: false, message: "Please provide all required fields" });
    }

    if (fromWarehouse === toWarehouse) {
      return res.status(400).json({ success: false, message: "Source and destination warehouses must be different" });
    }

    const transferQty = Math.abs(parseInt(quantity, 10));
    if (isNaN(transferQty) || transferQty <= 0) {
      return res.status(400).json({ success: false, message: "Quantity must be a positive integer" });
    }

    const inv = await Inventory.findOne({ productId: product, warehouseId: fromWarehouse }).session(session);
    const available = inv ? inv.quantity - (inv.reserved || 0) : 0;
    if (available < transferQty) {
      return res.status(400).json({
        success: false,
        message: `Insufficient available stock in source warehouse. Available: ${available}, requested: ${transferQty}`,
      });
    }

    const count = await Transfer.countDocuments({});
    const transferNumber = `TR-2026-${String(count + 1).padStart(4, "0")}`;

    inv.reserved += transferQty;
    await inv.save({ session });

    const transfer = await Transfer.create(
      [
        {
          transferNumber,
          fromWarehouse,
          toWarehouse,
          product,
          quantity: transferQty,
          status: "PENDING",
        },
      ],
      { session }
    );

    await AuditLog.create(
      [
        {
          action: "TRANSFER_CREATED",
          detail: `Stock Transfer ${transferNumber} created: Reserved ${transferQty} units of product ${product} from warehouse ${fromWarehouse}`,
          performedBy: req.user.name,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ success: true, data: transfer[0] });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

// @desc    Dispatch a stock transfer
// @route   PUT /api/transfers/:id/dispatch
// @access  Private (Admin, Manager, Inventory Staff)
export const dispatchTransfer = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const transfer = await Transfer.findById(req.params.id).session(session);
    if (!transfer) {
      return res.status(404).json({ success: false, message: "Transfer record not found" });
    }

    if (transfer.status !== "PENDING") {
      return res.status(400).json({ success: false, message: `Cannot dispatch transfer in ${transfer.status} state` });
    }

    const inv = await Inventory.findOne({
      productId: transfer.product,
      warehouseId: transfer.fromWarehouse,
    }).session(session);

    if (!inv || inv.quantity < transfer.quantity) {
      return res.status(400).json({ success: false, message: "Insufficient physical stock at source for dispatch" });
    }

    const prevQty = inv.quantity;
    inv.quantity = prevQty - transfer.quantity;
    inv.reserved = Math.max(0, inv.reserved - transfer.quantity);
    await inv.save({ session });

    await StockTransaction.create(
      [
        {
          product: transfer.product,
          warehouse: transfer.fromWarehouse,
          type: "TRANSFER_OUT",
          quantity: transfer.quantity,
          previousQuantity: prevQty,
          newQuantity: inv.quantity,
          referenceId: transfer.transferNumber,
          performedBy: req.user.name,
        },
      ],
      { session }
    );

    transfer.status = "IN_TRANSIT";
    await transfer.save({ session });

    await AuditLog.create(
      [
        {
          action: "TRANSFER_DISPATCHED",
          detail: `Transfer ${transfer.transferNumber} dispatched. Stock in transit.`,
          performedBy: req.user.name,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.json({ success: true, data: transfer });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

// @desc    Receive a stock transfer
// @route   PUT /api/transfers/:id/receive
// @access  Private (Admin, Manager, Inventory Staff)
export const receiveTransfer = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const transfer = await Transfer.findById(req.params.id).session(session);
    if (!transfer) {
      return res.status(404).json({ success: false, message: "Transfer record not found" });
    }

    if (transfer.status !== "IN_TRANSIT") {
      return res.status(400).json({ success: false, message: `Only IN_TRANSIT transfers can be received (current status: ${transfer.status})` });
    }

    let inv = await Inventory.findOne({
      productId: transfer.product,
      warehouseId: transfer.toWarehouse,
    }).session(session);

    if (!inv) {
      inv = new Inventory({
        productId: transfer.product,
        warehouseId: transfer.toWarehouse,
        quantity: 0,
        reserved: 0,
      });
    }

    const prevQty = inv.quantity;
    inv.quantity = prevQty + transfer.quantity;
    await inv.save({ session });

    await StockTransaction.create(
      [
        {
          product: transfer.product,
          warehouse: transfer.toWarehouse,
          type: "TRANSFER_IN",
          quantity: transfer.quantity,
          previousQuantity: prevQty,
          newQuantity: inv.quantity,
          referenceId: transfer.transferNumber,
          performedBy: req.user.name,
        },
      ],
      { session }
    );

    transfer.status = "RECEIVED";
    await transfer.save({ session });

    await AuditLog.create(
      [
        {
          action: "TRANSFER_RECEIVED",
          detail: `Transfer ${transfer.transferNumber} received at destination warehouse. Stock updated.`,
          performedBy: req.user.name,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.json({ success: true, data: transfer });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};
