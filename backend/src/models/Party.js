import mongoose from "mongoose";

const partySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      enum: ["supplier", "customer"],
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Party", partySchema);
