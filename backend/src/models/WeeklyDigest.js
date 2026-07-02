import mongoose from "mongoose";

const weeklyDigestSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    weekOf: { type: Date, required: true, index: true },
    summaryText: { type: String, required: true, trim: true },
    suggestions: [{ type: String, trim: true }],
    generatedAt: { type: Date, default: Date.now, index: true }
  },
  { timestamps: true }
);

weeklyDigestSchema.index({ userId: 1, weekOf: -1 });
weeklyDigestSchema.index({ weekOf: 1, generatedAt: 1 });

export const WeeklyDigest = mongoose.model("WeeklyDigest", weeklyDigestSchema);
