import mongoose from "mongoose";

const stockUpdateRequestSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    requestType: {
      type: String,
      enum: ["MANUAL_ADJUSTMENT", "EXCEL_IMPORT"],
      required: true,
      default: "MANUAL_ADJUSTMENT",
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    submittedByName: {
      type: String,
      required: true,
    },
    submittedByRole: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
      index: true,
    },
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        productName: {
          type: String,
        },
        sku: {
          type: String,
        },
        category: {
          type: String,
        },
        hsnCode: {
          type: String,
        },
        warehouseId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Warehouse",
          required: true,
        },
        warehouseName: {
          type: String,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        type: {
          type: String,
          enum: ["ADJUSTMENT_IN", "ADJUSTMENT_OUT"],
          default: "ADJUSTMENT_IN",
        },
        costPrice: {
          type: Number,
          default: 0,
        },
        sellingPrice: {
          type: Number,
          default: 0,
        },
        previousQuantity: {
          type: Number,
          default: 0,
        },
        reason: {
          type: String,
          trim: true,
        },
      },
    ],
    totalItemsCount: {
      type: Number,
      default: 1,
    },
    totalQuantity: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      trim: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reviewedByName: {
      type: String,
    },
    reviewedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("StockUpdateRequest", stockUpdateRequestSchema);
