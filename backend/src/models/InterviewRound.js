import mongoose from "mongoose";

const interviewRoundSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    applicationId: { type: mongoose.Schema.Types.ObjectId, ref: "Application", required: true, index: true },
    roundType: { type: String, enum: ["DSA", "HR", "Technical", "Managerial", "Other"], default: "Technical" },
    roundNumber: Number,
    scheduledAt: { type: Date, required: true, index: true },
    interviewerName: String,
    questionsAsked: [{ question: String, topic: String, answerNotes: String, difficulty: String }],
    feedback: String,
    result: { type: String, enum: ["Pending", "Cleared", "Rejected", "Rescheduled", "Unknown"], default: "Pending" }
  },
  { timestamps: true }
);

interviewRoundSchema.index({ userId: 1, applicationId: 1 });
interviewRoundSchema.index({ userId: 1, scheduledAt: 1 });

export const InterviewRound = mongoose.model("InterviewRound", interviewRoundSchema);
