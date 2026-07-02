import { z } from "zod";
import { APPLICATION_SOURCES, APPLICATION_STATUSES, REJECTION_STAGES } from "../models/Application.js";

const optionalDate = z
  .string()
  .datetime()
  .or(z.string().date())
  .or(z.literal(""))
  .optional()
  .nullable()
  .transform((value) => (value ? new Date(value) : undefined));

const requiredDate = z
  .string()
  .datetime()
  .or(z.string().date())
  .transform((value) => new Date(value));

const reminderSuggestionSchema = z.object({
  type: z.enum(["APPLICATION_FOLLOW_UP", "DEADLINE_APPROACHING"]),
  scheduledFor: z.string().datetime().or(z.string()).transform((value) => new Date(value)),
  reasoning: z.string().trim().max(1000).optional().default("")
});

const applicationBody = z.object({
  resumeVersionId: z.string().trim().min(1).optional().or(z.literal("")).default(""),
  companyName: z.string().trim().min(1).max(120),
  role: z.string().trim().min(1).max(120),
  location: z.string().trim().max(120).optional().default(""),
  appliedDate: requiredDate,
  deadline: optionalDate,
  status: z.enum(APPLICATION_STATUSES).optional().default("Applied"),
  rejectionStage: z.enum(REJECTION_STAGES).optional(),
  rejectionFeedback: z.string().trim().max(10000).optional().default(""),
  source: z.enum(APPLICATION_SOURCES).optional().default("Other"),
  jobLink: z.string().trim().url().optional().or(z.literal("")).default(""),
  jobDescriptionText: z.string().max(30000).optional().default(""),
  notes: z.string().max(10000).optional().default(""),
  tags: z.array(z.string().trim().min(1).max(32)).max(20).optional().default([]),
  reminderSuggestions: z.array(reminderSuggestionSchema).max(3).optional()
});

export const createApplicationSchema = z.object({
  body: applicationBody,
  params: z.object({}).optional(),
  query: z.object({}).optional()
});

export const updateApplicationSchema = z.object({
  body: applicationBody.partial(),
  params: z.object({
    id: z.string().min(1)
  }),
  query: z.object({}).optional()
});

export const applicationIdSchema = z.object({
  body: z.object({}).optional(),
  params: z
    .object({
      id: z.string().min(1).optional(),
      applicationId: z.string().min(1).optional()
    })
    .refine((value) => value.id || value.applicationId, {
      message: "Application id is required"
    }),
  query: z.object({}).optional()
});

export const listApplicationsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    status: z.enum(APPLICATION_STATUSES).optional(),
    search: z.string().trim().optional(),
    company: z.string().trim().optional(),
    location: z.string().trim().optional(),
    source: z.enum(APPLICATION_SOURCES).optional(),
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(20)
  })
});

export const updateStatusSchema = z.object({
  body: z.object({
    status: z.enum(APPLICATION_STATUSES),
    rejectionStage: z.enum(REJECTION_STAGES).optional(),
    rejectionFeedback: z.string().trim().max(10000).optional().default("")
  }),
  params: z.object({
    id: z.string().min(1)
  }),
  query: z.object({}).optional()
});
