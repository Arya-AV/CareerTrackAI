import mongoose from "mongoose";

export const APPLICATION_STATUSES = ["Applied", "OA", "Interview", "Offer", "Rejected"];
export const APPLICATION_SOURCES = ["LinkedIn", "Referral", "Campus", "Careers page", "Other"];
export const REJECTION_STAGES = ["applied", "oa", "phone_screen", "technical", "onsite", "offer_stage", "other"];

const applicationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    resumeVersionId: { type: mongoose.Schema.Types.ObjectId, ref: "ResumeVersion", index: true },
    companyName: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    location: { type: String, trim: true },
    appliedDate: { type: Date, required: true },
    deadline: Date,
    status: { type: String, enum: APPLICATION_STATUSES, default: "Applied", index: true },
    rejectionStage: { type: String, enum: REJECTION_STAGES },
    rejectionFeedback: { type: String, trim: true },
    source: { type: String, enum: APPLICATION_SOURCES, default: "Other" },
    jobLink: { type: String, trim: true },
    jobDescriptionText: String,
    notes: String,
    tags: [{ type: String, trim: true }]
  },
  { timestamps: true }
);

applicationSchema.index({ userId: 1, status: 1 });
applicationSchema.index({ userId: 1, status: 1, rejectionStage: 1 });
applicationSchema.index({ userId: 1, companyName: 1 });
applicationSchema.index({ userId: 1, resumeVersionId: 1 });
applicationSchema.index({ userId: 1, appliedDate: -1 });
applicationSchema.index({ userId: 1, deadline: 1 });
applicationSchema.index({ appliedDate: -1 });
applicationSchema.index({ updatedAt: -1 });
applicationSchema.index({
  companyName: "text",
  role: "text",
  notes: "text",
  jobDescriptionText: "text"
});

export const Application = mongoose.model("Application", applicationSchema);
