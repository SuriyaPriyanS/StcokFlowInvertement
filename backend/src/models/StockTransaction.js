import mongoose from "mongoose";

const stockTransactionSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["PURCHASE", "SALE", "TRANSFER_IN", "TRANSFER_OUT", "ADJUSTMENT_IN", "ADJUSTMENT_OUT"],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    previousQuantity: {
      type: Number,
      required: true,
    },
    newQuantity: {
      type: Number,
      required: true,
    },
    performedBy: {
      type: String,
      required: true,
    },
    referenceId: {
      type: String,
      trim: true,
    },
    reason: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("StockTransaction", stockTransactionSchema);
