import mongoose from "mongoose";

const contactSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    company: { type: String, required: true, trim: true },
    role: { type: String, trim: true, default: "" },
    linkedinUrl: { type: String, trim: true, default: "" },
    notes: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, lowercase: true, default: "" },
    contactType: {
      type: String,
      enum: ["", "Alumni", "Recruiter", "Employee", "Hiring Manager", "Friend", "Other"],
      default: ""
    },
    outreachStatus: {
      type: String,
      enum: ["", "Not Contacted", "Drafted", "Emailed", "Replied", "No Response"],
      default: ""
    },
    lastContactedAt: Date
  },
  { timestamps: true }
);

contactSchema.index({ userId: 1, company: 1, name: 1 });
contactSchema.index({
  name: "text",
  company: "text",
  role: "text",
  notes: "text"
});

export const Contact = mongoose.model("Contact", contactSchema);
