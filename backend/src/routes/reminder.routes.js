import { Router } from "express";
import { listReminders, suggestReminders, updateReminder } from "../controllers/reminder.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { listRemindersSchema, suggestRemindersSchema, updateReminderSchema } from "../validators/tracker.schema.js";

const router = Router();

router.use(requireAuth);

router.get("/", validate(listRemindersSchema), listReminders);
router.patch("/:id", validate(updateReminderSchema), updateReminder);
router.post("/suggest", validate(suggestRemindersSchema), suggestReminders);

export default router;
