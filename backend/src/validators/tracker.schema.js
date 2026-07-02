import { z } from "zod";

const dateTime = z.string().datetime().or(z.string()).transform((value) => new Date(value));

const reminderSuggestionSchema = z.object({
  type: z.enum(["INTERVIEW_PREP", "INTERVIEW_2_HOURS"]),
  scheduledFor: dateTime,
  reasoning: z.string().trim().max(1000).optional().default("")
});

export const createOASchema = z.object({
  body: z.object({
    scheduledAt: dateTime,
    platform: z.string().trim().optional().default(""),
    durationMinutes: z.coerce.number().int().positive().optional(),
    difficulty: z.enum(["Easy", "Medium", "Hard", "Mixed"]).optional().default("Mixed"),
    score: z.string().trim().max(120).optional().default(""),
    resultStatus: z.enum(["Pending", "Completed", "Passed", "Failed"]).optional().default("Pending"),
    notes: z.string().optional().default("")
  }),
  params: z.object({ applicationId: z.string().min(1) }),
  query: z.object({}).optional()
});

export const listOASchema = z.object({
  body: z.object({}).optional(),
  params: z.object({ applicationId: z.string().min(1) }),
  query: z.object({}).optional()
});

export const oaIdSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({ oaId: z.string().min(1) }),
  query: z.object({}).optional()
});

export const createInterviewSchema = z.object({
  body: z.object({
    scheduledAt: dateTime,
    roundType: z.enum(["DSA", "HR", "Technical", "Managerial", "Other"]).optional().default("Technical"),
    roundNumber: z.number().optional(),
    interviewerName: z.string().optional().default(""),
    reminderSuggestions: z.array(reminderSuggestionSchema).max(3).optional()
  }),
  params: z.object({ applicationId: z.string().min(1) }),
  query: z.object({}).optional()
});

export const listInterviewsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({ applicationId: z.string().min(1) }),
  query: z.object({}).optional()
});

export const extractInterviewReplaySchema = z.object({
  body: z.object({
    text: z.string().trim().min(1).max(30000)
  }),
  params: z.object({ interviewRoundId: z.string().min(1) }),
  query: z.object({}).optional()
});

export const confirmInterviewReplaySchema = z.object({
  body: z.object({
    items: z
      .array(
        z.object({
          question: z.string().trim().min(1).max(1000),
          answerSummary: z.string().trim().min(1).max(5000),
          tag: z.enum(["Mistake", "Revision Note"])
        })
      )
      .min(1)
      .max(50)
  }),
  params: z.object({ interviewRoundId: z.string().min(1) }),
  query: z.object({}).optional()
});

export const createReferralSchema = z.object({
  body: z.object({
    applicationId: z.string().min(1).optional(),
    contactId: z.string().min(1).optional(),
    referrerName: z.string().trim().optional().default(""),
    company: z.string().trim().optional().default(""),
    linkedInProfile: z.string().optional().default(""),
    followUpDate: dateTime.optional(),
    followUpAfterDays: z.number().int().positive().optional().default(7),
    message: z.string().optional()
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional()
});

export const listRemindersSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    status: z.enum(["Pending", "Processing", "Sent", "Failed", "Cancelled"]).optional(),
    limit: z.coerce.number().int().positive().max(100).optional().default(50)
  })
});

export const updateReminderSchema = z.object({
  body: z.object({
    status: z.enum(["Cancelled"])
  }),
  params: z.object({
    id: z.string().trim().min(1)
  }),
  query: z.object({}).optional()
});

export const suggestRemindersSchema = z.object({
  body: z
    .object({
      applicationId: z.string().trim().min(1).optional(),
      interviewRoundId: z.string().trim().min(1).optional()
    })
    .refine((value) => Boolean(value.applicationId) !== Boolean(value.interviewRoundId), {
      message: "Provide exactly one of applicationId or interviewRoundId"
    }),
  params: z.object({}).optional(),
  query: z.object({}).optional()
});
