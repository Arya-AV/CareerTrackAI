import { z } from "zod";
import { NOTE_TYPES } from "../models/Note.js";

const noteBody = z.object({
  applicationId: z.string().min(1).optional().or(z.literal("")),
  type: z.enum(NOTE_TYPES).optional().default("General"),
  title: z.string().trim().min(1).max(140),
  content: z.string().trim().min(1).max(20000),
  company: z.string().trim().max(120).optional().default(""),
  role: z.string().trim().max(120).optional().default(""),
  tags: z
    .array(z.string().trim().min(1).max(32))
    .max(20)
    .optional()
    .default([])
});

export const createNoteSchema = z.object({
  body: noteBody.transform((body) => ({
    ...body,
    applicationId: body.applicationId || undefined
  })),
  params: z.object({}).optional(),
  query: z.object({}).optional()
});

export const updateNoteSchema = z.object({
  body: noteBody.partial().transform((body) => ({
    ...body,
    applicationId: body.applicationId || undefined
  })),
  params: z.object({ id: z.string().min(1) }),
  query: z.object({}).optional()
});

export const noteIdSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({ id: z.string().min(1) }),
  query: z.object({}).optional()
});

export const listNotesSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    search: z.string().trim().optional(),
    type: z.enum(NOTE_TYPES).optional(),
    tag: z.string().trim().optional(),
    limit: z.coerce.number().int().positive().max(100).optional().default(50)
  })
});
