import { Router } from "express";
import * as applicationController from "../controllers/application.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  applicationIdSchema,
  createApplicationSchema,
  listApplicationsSchema,
  updateApplicationSchema,
  updateStatusSchema
} from "../validators/application.schema.js";

const router = Router();

router.use(requireAuth);

router
  .route("/")
  .get(validate(listApplicationsSchema), applicationController.listApplications)
  .post(validate(createApplicationSchema), applicationController.createApplication);

router.patch("/:id/status", validate(updateStatusSchema), applicationController.updateApplicationStatus);

router.get(
  "/:applicationId/ai-analyses",
  validate(applicationIdSchema),
  applicationController.listApplicationAiAnalyses
);

router.get(
  "/:applicationId/notes",
  validate(applicationIdSchema),
  applicationController.listApplicationNotes
);

router
  .route("/:id")
  .get(validate(applicationIdSchema), applicationController.getApplication)
  .patch(validate(updateApplicationSchema), applicationController.updateApplication)
  .delete(validate(applicationIdSchema), applicationController.deleteApplication);

export default router;
