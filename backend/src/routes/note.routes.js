import { Router } from "express";
import {
  createNote,
  deleteNote,
  listNotes,
  listTags,
  updateNote
} from "../controllers/note.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  createNoteSchema,
  listNotesSchema,
  noteIdSchema,
  updateNoteSchema
} from "../validators/note.schema.js";

const router = Router();

router.use(requireAuth);

router.get("/tags", listTags);
router.route("/").get(validate(listNotesSchema), listNotes).post(validate(createNoteSchema), createNote);
router.route("/:id").patch(validate(updateNoteSchema), updateNote).delete(validate(noteIdSchema), deleteNote);

export default router;
