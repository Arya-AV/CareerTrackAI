import { Router } from "express";
import {
  createResumeVersion,
  deleteResumeVersion,
  getResumeVersion,
  getResumeVersionPerformance,
  listResumeVersions,
  updateResumeVersion
} from "../controllers/resumeVersion.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  createResumeVersionSchema,
  listResumeVersionsSchema,
  resumeVersionIdSchema,
  updateResumeVersionSchema
} from "../validators/resumeVersion.schema.js";

const router = Router();

router.use(requireAuth);

router
  .route("/")
  .get(validate(listResumeVersionsSchema), listResumeVersions)
  .post(validate(createResumeVersionSchema), createResumeVersion);

router.get("/:id/performance", validate(resumeVersionIdSchema), getResumeVersionPerformance);

router
  .route("/:id")
  .get(validate(resumeVersionIdSchema), getResumeVersion)
  .patch(validate(updateResumeVersionSchema), updateResumeVersion)
  .delete(validate(resumeVersionIdSchema), deleteResumeVersion);

export default router;
