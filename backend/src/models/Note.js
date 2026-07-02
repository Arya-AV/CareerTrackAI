import mongoose from "mongoose";

export const NOTE_TYPES = [
  "OA Question",
  "Interview Question",
  "Mistake",
  "Revision Note",
  "Company Experience",
  "General"
];

const noteSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    applicationId: { type: mongoose.Schema.Types.ObjectId, ref: "Application", index: true },
    type: { type: String, enum: NOTE_TYPES, default: "General", index: true },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    company: { type: String, trim: true },
    role: { type: String, trim: true },
    tags: [{ type: String, trim: true }],
    sourceType: {
      type: String,
      enum: ["Application", "OA", "Interview", "Manual"],
      default: "Manual"
    },
    sourceId: mongoose.Schema.Types.ObjectId
  },
  { timestamps: true }
);

noteSchema.index({ userId: 1, type: 1, createdAt: -1 });
noteSchema.index({ userId: 1, tags: 1 });
noteSchema.index({
  title: "text",
  content: "text",
  company: "text",
  role: "text",
  tags: "text"
});

export const Note = mongoose.model("Note", noteSchema);
