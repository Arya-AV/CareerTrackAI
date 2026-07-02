import { Router } from "express";
import { listSkillGaps } from "../controllers/skillGap.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth);

router.get("/", listSkillGaps);

export default router;
