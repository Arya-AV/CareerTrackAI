import { Router } from "express";
import { analyzeJd, resumeMatch } from "../controllers/ai.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { analyzeJdSchema, resumeMatchSchema } from "../validators/ai.schema.js";

const router = Router();

router.use(requireAuth);

router.post("/jd-analyze", validate(analyzeJdSchema), analyzeJd);
router.post("/resume-match", validate(resumeMatchSchema), resumeMatch);

export default router;
