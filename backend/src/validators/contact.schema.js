import { z } from "zod";

const contactBody = z.object({
  name: z.string().trim().min(1).max(120),
  company: z.string().trim().min(1).max(120),
  role: z.string().trim().max(120).optional().default(""),
  linkedinUrl: z.string().trim().url().optional().or(z.literal("")).default(""),
  notes: z.string().trim().max(5000).optional().default(""),
  email: z.string().trim().email().toLowerCase().optional().or(z.literal("")).default(""),
  contactType: z
    .enum(["", "Alumni", "Recruiter", "Employee", "Hiring Manager", "Friend", "Other"])
    .optional()
    .default(""),
  outreachStatus: z
    .enum(["", "Not Contacted", "Drafted", "Emailed", "Replied", "No Response"])
    .optional()
    .default(""),
  lastContactedAt: z.coerce.date().optional().nullable()
});

export const listContactsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    search: z.string().trim().optional(),
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(50)
  })
});

export const createContactSchema = z.object({
  body: contactBody,
  params: z.object({}).optional(),
  query: z.object({}).optional()
});

export const updateContactSchema = z.object({
  body: contactBody.partial(),
  params: z.object({
    id: z.string().min(1)
  }),
  query: z.object({}).optional()
});

export const contactIdSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({
    id: z.string().min(1)
  }),
  query: z.object({}).optional()
});

export const outreachDraftSchema = z.object({
  body: z.object({
    purpose: z.string().trim().max(500).optional().default("Ask for a referral or career advice"),
    context: z.string().trim().max(3000).optional().default("")
  }),
  params: z.object({
    id: z.string().min(1)
  }),
  query: z.object({}).optional()
});
