import mongoose from "mongoose";

const channelPostingSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    sourceName: { type: String, required: true, trim: true },
    companyName: { type: String, required: true, trim: true },
    roleTitle: { type: String, trim: true },
    jobLink: { type: String, trim: true },
    rawText: { type: String, trim: true },
    postedDate: Date,
    addedAt: { type: Date, default: Date.now, index: true },
    tags: [{ type: String, trim: true }]
  },
  { timestamps: true }
);

channelPostingSchema.index({ userId: 1, addedAt: -1 });
channelPostingSchema.index({ userId: 1, companyName: 1 });
channelPostingSchema.index({ userId: 1, sourceName: 1 });
channelPostingSchema.index({ userId: 1, tags: 1 });

export const ChannelPosting = mongoose.model("ChannelPosting", channelPostingSchema);
