import { Router } from "express";
import { getCompany, listCompanies } from "../controllers/company.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth);

router.get("/", listCompanies);
router.get("/:companyName", getCompany);

export default router;
