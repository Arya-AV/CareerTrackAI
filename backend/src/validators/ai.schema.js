import { z } from "zod";

export const jdAnalysisResultSchema = z.object({
  required_skills: z.array(z.string()).default([]),
  missing_skills: z.array(z.string()).default([]),
  resume_keyword_suggestions: z.array(z.string()).default([]),
  prep_checklist: z.array(z.string()).default([]),
  dsa_topics_to_revise: z.array(z.string()).default([]),
  warning: z.string().nullable().default(null)
});

export const resumeMatchResultSchema = z.object({
  match_percentage: z.number().min(0).max(100),
  matched_keywords: z.array(z.string()).default([]),
  missing_keywords: z.array(z.string()).default([]),
  bullet_suggestions: z
    .array(
      z.object({
        original: z.string(),
        improved: z.string(),
        reason: z.string()
      })
    )
    .default([]),
  score_justification: z.string().default(""),
  warning: z.string().nullable().default(null)
});

export const interviewReplayItemSchema = z.object({
  question: z.string().trim().min(1).max(1000),
  answerSummary: z.string().trim().min(1).max(5000),
  suggestedTag: z.enum(["Mistake", "Revision Note"])
});

export const channelPostingExtractionSchema = z.object({
  companyName: z.string().trim().default(""),
  roleTitle: z.string().trim().default(""),
  jobLink: z.string().trim().default(""),
  warning: z.string().nullable().default(null)
});

export const contactOutreachDraftSchema = z.object({
  draft: z.string().trim().min(1).max(6000)
});

export const analyzeJdSchema = z.object({
  body: z.object({
    jdText: z.string().trim().min(20).max(30000),
    applicationId: z.string().trim().min(1).optional(),
    useSavedProfile: z.boolean().optional().default(true)
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional()
});

export const resumeMatchSchema = z.object({
  body: z.object({
    resumeText: z.string().trim().min(20).max(50000),
    jdText: z.string().trim().min(20).max(30000),
    applicationId: z.string().trim().min(1).optional()
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional()
});
