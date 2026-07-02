import mongoose from "mongoose";

const reminderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    applicationId: { type: mongoose.Schema.Types.ObjectId, ref: "Application", index: true },
    type: {
      type: String,
      enum: [
        "OA_TOMORROW",
        "INTERVIEW_2_HOURS",
        "INTERVIEW_PREP",
        "REFERRAL_FOLLOW_UP",
        "APPLICATION_FOLLOW_UP",
        "TO_APPLY_CHECK",
        "TO_APPLY_DEADLINE",
        "DEADLINE_APPROACHING"
      ],
      required: true,
      index: true
    },
    relatedEntityType: {
      type: String,
      enum: ["Application", "OARecord", "InterviewRound", "Referral", "ToApply"],
      required: true
    },
    relatedEntityId: { type: mongoose.Schema.Types.ObjectId, required: true },
    scheduledFor: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ["Pending", "Processing", "Sent", "Failed", "Cancelled"],
      default: "Pending",
      index: true
    },
    attempts: { type: Number, default: 0 },
    lastAttemptAt: Date,
    sentAt: Date,
    nextRetryAt: Date,
    errorMessage: String,
    emailTo: String,
    subject: String,
    message: String,
    link: String,
    payload: mongoose.Schema.Types.Mixed
  },
  { timestamps: true }
);

reminderSchema.index({ status: 1, scheduledFor: 1 });
reminderSchema.index({ userId: 1, scheduledFor: -1 });
reminderSchema.index(
  { relatedEntityType: 1, relatedEntityId: 1, type: 1 },
  { unique: true, partialFilterExpression: { status: { $ne: "Cancelled" } } }
);

export const Reminder = mongoose.model("Reminder", reminderSchema);
