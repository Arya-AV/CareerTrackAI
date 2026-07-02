import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    channel: { type: String, enum: ["LinkedIn", "Email", "Other"], default: "LinkedIn" },
    message: String,
    sentAt: { type: Date, default: Date.now },
    direction: { type: String, enum: ["Sent", "Received"], default: "Sent" }
  },
  { _id: false }
);

const referralSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    applicationId: { type: mongoose.Schema.Types.ObjectId, ref: "Application", index: true },
    contactId: { type: mongoose.Schema.Types.ObjectId, ref: "Contact", index: true },
    referrerName: { type: String, required: true, trim: true },
    company: { type: String, required: true, trim: true },
    linkedInProfile: String,
    referralStatus: {
      type: String,
      enum: ["Requested", "Followed Up", "Referred", "Declined", "No Response"],
      default: "Requested"
    },
    followUpDate: { type: Date, index: true },
    followUpAfterDays: { type: Number, default: 7 },
    messageHistory: [messageSchema],
    notes: String
  },
  { timestamps: true }
);

referralSchema.index({ userId: 1, company: 1 });
referralSchema.index({ userId: 1, contactId: 1 });
referralSchema.index({ userId: 1, followUpDate: 1 });

export const Referral = mongoose.model("Referral", referralSchema);
