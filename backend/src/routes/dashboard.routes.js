import { Router } from "express";
import {
  getCompanyStatusBreakdown,
  getDashboardSummary,
  getMomentum,
  getMonthlyVolume,
  getRejectionPatterns
} from "../controllers/dashboard.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth);

router.get("/summary", getDashboardSummary);
router.get("/momentum", getMomentum);
router.get("/company-status", getCompanyStatusBreakdown);
router.get("/monthly-volume", getMonthlyVolume);
router.get("/rejection-patterns", getRejectionPatterns);

export default router;
