import { Router } from "express";
import { generateDigest, latestDigest } from "../controllers/digest.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth);

router.get("/latest", latestDigest);
router.post("/generate", generateDigest);

export default router;
