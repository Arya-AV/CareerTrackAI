import { Router } from "express";
import {
  createContact,
  deleteContact,
  generateOutreachDraft,
  getContact,
  listContactApplications,
  listContacts,
  updateContact
} from "../controllers/contact.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  contactIdSchema,
  createContactSchema,
  listContactsSchema,
  outreachDraftSchema,
  updateContactSchema
} from "../validators/contact.schema.js";

const router = Router();

router.use(requireAuth);

router
  .route("/")
  .get(validate(listContactsSchema), listContacts)
  .post(validate(createContactSchema), createContact);

router.get("/:id/applications", validate(contactIdSchema), listContactApplications);
router.post("/:id/outreach-draft", validate(outreachDraftSchema), generateOutreachDraft);

router
  .route("/:id")
  .get(validate(contactIdSchema), getContact)
  .patch(validate(updateContactSchema), updateContact)
  .delete(validate(contactIdSchema), deleteContact);

export default router;
