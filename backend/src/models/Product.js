import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    sku: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    barcode: {
      type: String,
      trim: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    brand: {
      type: String,
      trim: true,
    },
    costPrice: {
      type: Number,
      required: true,
      default: 0,
    },
    sellingPrice: {
      type: Number,
      required: true,
      default: 0,
    },
    tax: {
      type: Number,
      default: 18,
    },
    unit: {
      type: String,
      enum: ["piece", "kg", "box", "litre", "pack"],
      default: "piece",
    },
    minimumStock: {
      type: Number,
      default: 0,
    },
    maximumStock: {
      type: Number,
      default: 0,
    },
    reorderLevel: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    imageUrl: {
      type: String,
      default: "",
    },
    imageUrls: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

export default mongoose.model("Product", productSchema);
