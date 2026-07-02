import { Router } from "express";
import {
  convertToApplication,
  createToApply,
  deleteToApply,
  listToApply,
  updateToApply
} from "../controllers/toApply.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  createToApplySchema,
  listToApplySchema,
  toApplyIdSchema,
  updateToApplySchema
} from "../validators/toApply.schema.js";

const router = Router();

router.use(requireAuth);

router
  .route("/")
  .post(validate(createToApplySchema), createToApply)
  .get(validate(listToApplySchema), listToApply);

router.post("/:id/convert-to-application", validate(toApplyIdSchema), convertToApplication);

router
  .route("/:id")
  .patch(validate(updateToApplySchema), updateToApply)
  .delete(validate(toApplyIdSchema), deleteToApply);

export default router;
