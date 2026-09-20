import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "LOW_STOCK",
        "OUT_OF_STOCK",
        "STOCK_REQUEST_PENDING",
        "STOCK_REQUEST_APPROVED",
        "STOCK_REQUEST_REJECTED",
        "SYSTEM",
      ],
      required: true,
      default: "LOW_STOCK",
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    severity: {
      type: String,
      enum: ["info", "warning", "critical"],
      default: "warning",
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    },
    productName: {
      type: String,
    },
    sku: {
      type: String,
    },
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
    },
    warehouseName: {
      type: String,
    },
    currentStock: {
      type: Number,
    },
    reorderLevel: {
      type: Number,
    },
    targetRoles: {
      type: [String],
      default: ["Admin", "Manager", "Inventory Staff"],
    },
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    link: {
      type: String,
      default: "/inventory",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Notification", notificationSchema);
