import mongoose from "mongoose";

const oaRecordSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    applicationId: { type: mongoose.Schema.Types.ObjectId, ref: "Application", required: true, index: true },
    scheduledAt: { type: Date, required: true, index: true },
    platform: { type: String, trim: true },
    durationMinutes: Number,
    difficulty: { type: String, enum: ["Easy", "Medium", "Hard", "Mixed"], default: "Mixed" },
    questionsAsked: [{ title: String, topic: String, difficulty: String, notes: String }],
    score: String,
    resultStatus: { type: String, enum: ["Pending", "Completed", "Passed", "Failed", "Unknown"], default: "Pending" },
    notes: String
  },
  { timestamps: true }
);

oaRecordSchema.index({ userId: 1, applicationId: 1 });
oaRecordSchema.index({ userId: 1, scheduledAt: 1 });

export const OARecord = mongoose.model("OARecord", oaRecordSchema);
