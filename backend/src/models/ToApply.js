import mongoose from "mongoose";

export const TO_APPLY_STATUSES = ["pending", "applied", "dismissed"];

const toApplySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    companyName: { type: String, required: true, trim: true },
    jobLink: { type: String, required: true, trim: true },
    roleTitle: { type: String, trim: true },
    notes: { type: String, trim: true },
    status: { type: String, enum: TO_APPLY_STATUSES, default: "pending", index: true },
    deadlineDate: Date
  },
  { timestamps: true }
);

toApplySchema.index({ userId: 1, status: 1, createdAt: -1 });
toApplySchema.index({ userId: 1, deadlineDate: 1 });

export const ToApply = mongoose.model("ToApply", toApplySchema);
