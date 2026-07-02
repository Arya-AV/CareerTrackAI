import { Router } from "express";
import {
  confirmInterviewReplay,
  createInterview,
  createOA,
  deleteOA,
  createReferral,
  extractInterviewReplay,
  listInterviews,
  listOAs
} from "../controllers/tracker.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  confirmInterviewReplaySchema,
  createInterviewSchema,
  createOASchema,
  createReferralSchema,
  extractInterviewReplaySchema,
  listInterviewsSchema,
  listOASchema,
  oaIdSchema
} from "../validators/tracker.schema.js";

const router = Router();

router.use(requireAuth);

router
  .route("/applications/:applicationId/oas")
  .get(validate(listOASchema), listOAs)
  .post(validate(createOASchema), createOA);
router.delete("/oas/:oaId", validate(oaIdSchema), deleteOA);
router
  .route("/applications/:applicationId/interviews")
  .get(validate(listInterviewsSchema), listInterviews)
  .post(validate(createInterviewSchema), createInterview);
router.post("/interviews/:interviewRoundId/replay", validate(extractInterviewReplaySchema), extractInterviewReplay);
router.post(
  "/interviews/:interviewRoundId/replay/confirm",
  validate(confirmInterviewReplaySchema),
  confirmInterviewReplay
);
router.post("/referrals", validate(createReferralSchema), createReferral);

export default router;
