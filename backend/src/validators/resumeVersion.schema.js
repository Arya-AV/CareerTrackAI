import { z } from "zod";

const resumeVersionBody = z.object({
  label: z.string().trim().min(1).max(120),
  content: z.string().trim().min(1).max(50000),
  archived: z.boolean().optional()
});

export const listResumeVersionsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    includeArchived: z.coerce.boolean().optional().default(false)
  })
});

export const createResumeVersionSchema = z.object({
  body: resumeVersionBody,
  params: z.object({}).optional(),
  query: z.object({}).optional()
});

export const updateResumeVersionSchema = z.object({
  body: resumeVersionBody.partial(),
  params: z.object({
    id: z.string().min(1)
  }),
  query: z.object({}).optional()
});

export const resumeVersionIdSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({
    id: z.string().min(1)
  }),
  query: z.object({}).optional()
});
