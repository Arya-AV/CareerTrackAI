import { z } from "zod";
import { TO_APPLY_STATUSES } from "../models/ToApply.js";

const optionalDate = z
  .string()
  .datetime()
  .or(z.string().date())
  .or(z.literal(""))
  .optional()
  .nullable()
  .transform((value) => (value ? new Date(value) : undefined));

const toApplyBody = z.object({
  companyName: z.string().trim().min(1).max(120),
  jobLink: z.string().trim().url(),
  roleTitle: z.string().trim().max(120).optional().default(""),
  notes: z.string().trim().max(10000).optional().default(""),
  status: z.enum(TO_APPLY_STATUSES).optional().default("pending"),
  deadlineDate: optionalDate
});

export const createToApplySchema = z.object({
  body: toApplyBody,
  params: z.object({}).optional(),
  query: z.object({}).optional()
});

export const updateToApplySchema = z.object({
  body: toApplyBody.partial(),
  params: z.object({ id: z.string().min(1) }),
  query: z.object({}).optional()
});

export const listToApplySchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    status: z.enum(TO_APPLY_STATUSES).optional().default("pending"),
    limit: z.coerce.number().int().positive().max(100).optional().default(100)
  })
});

export const toApplyIdSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({ id: z.string().min(1) }),
  query: z.object({}).optional()
});
