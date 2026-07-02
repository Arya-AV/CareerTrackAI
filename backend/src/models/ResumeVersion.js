import mongoose from "mongoose";

const resumeVersionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    label: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    archived: { type: Boolean, default: false, index: true }
  },
  { timestamps: true }
);

resumeVersionSchema.index({ userId: 1, archived: 1, createdAt: -1 });
resumeVersionSchema.index({ userId: 1, label: 1 });

export const ResumeVersion = mongoose.model("ResumeVersion", resumeVersionSchema);
