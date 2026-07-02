import { z } from "zod";

const optionalDate = z
  .string()
  .datetime()
  .or(z.string().date())
  .or(z.literal(""))
  .optional()
  .nullable()
  .transform((value) => (value ? new Date(value) : undefined));

const tagsSchema = z
  .array(z.string().trim().min(1).max(40))
  .max(20)
  .optional()
  .default([]);

const postingFields = {
  sourceName: z.string().trim().min(1).max(160),
  companyName: z.string().trim().min(1).max(120),
  roleTitle: z.string().trim().max(160).optional().default(""),
  jobLink: z.string().trim().url().optional().or(z.literal("")).default(""),
  rawText: z.string().trim().max(30000).optional().default(""),
  postedDate: optionalDate,
  tags: tagsSchema
};

export const createChannelPostingSchema = z.object({
  body: z.union([
    z.object({ rawText: z.string().trim().min(20).max(30000) }).strict(),
    z.object(postingFields)
  ]),
  params: z.object({}).optional(),
  query: z.object({}).optional()
});

export const confirmChannelPostingSchema = z.object({
  body: z.object(postingFields),
  params: z.object({}).optional(),
  query: z.object({}).optional()
});

export const listChannelPostingsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    search: z.string().trim().optional(),
    company: z.string().trim().optional(),
    source: z.string().trim().optional(),
    tag: z.string().trim().optional(),
    limit: z.coerce.number().int().positive().max(100).optional().default(100)
  })
});

export const channelPostingIdSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({ id: z.string().min(1) }),
  query: z.object({}).optional()
});
