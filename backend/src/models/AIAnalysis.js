import mongoose from "mongoose";

const aiAnalysisSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    applicationId: { type: mongoose.Schema.Types.ObjectId, ref: "Application", index: true },
    type: {
      type: String,
      enum: ["JD_ANALYSIS", "RESUME_MATCH", "INTERVIEW_REPLAY", "CHANNEL_POSTING", "CONTACT_OUTREACH"],
      required: true,
      index: true
    },
    inputHash: { type: String, required: true },
    jdTextHash: { type: String, required: true },
    resumeContextHash: String,
    result: {
      required_skills: [{ type: String }],
      missing_skills: [{ type: String }],
      resume_keyword_suggestions: [{ type: String }],
      prep_checklist: [{ type: String }],
      dsa_topics_to_revise: [{ type: String }],
      match_percentage: Number,
      matched_keywords: [{ type: String }],
      missing_keywords: [{ type: String }],
      bullet_suggestions: [
        {
          original: String,
          improved: String,
          reason: String
        }
      ],
      score_justification: String,
      interview_replay_items: [
        {
          question: String,
          answerSummary: String,
          suggestedTag: String
        }
      ],
      companyName: String,
      roleTitle: String,
      jobLink: String,
      draft: String,
      warning: { type: String, default: null }
    },
    model: String,
    cachedFromAnalysisId: mongoose.Schema.Types.ObjectId,
    tokenUsage: mongoose.Schema.Types.Mixed
  },
  { timestamps: true }
);

aiAnalysisSchema.index({ userId: 1, type: 1, inputHash: 1 }, { unique: true });
aiAnalysisSchema.index({ userId: 1, applicationId: 1, type: 1, createdAt: -1 });

export const AIAnalysis = mongoose.model("AIAnalysis", aiAnalysisSchema);
