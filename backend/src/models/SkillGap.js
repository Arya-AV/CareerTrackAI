import mongoose from "mongoose";

const skillGapSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    skillName: { type: String, required: true, trim: true },
    timesRequested: { type: Number, default: 0 },
    timesMatched: { type: Number, default: 0 },
    lastSeenAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

skillGapSchema.index({ userId: 1, skillName: 1 }, { unique: true });
skillGapSchema.index({ userId: 1, lastSeenAt: -1 });

export const SkillGap = mongoose.model("SkillGap", skillGapSchema);
