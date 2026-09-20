import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      index: true,
    },
    detail: {
      type: String,
      required: true,
    },
    performedBy: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("AuditLog", auditLogSchema);
