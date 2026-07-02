import cron from "node-cron";
import { processDueReminders } from "../services/reminder.service.js";

export const startReminderCron = () => {
  cron.schedule("* * * * *", async () => {
    try {
      await processDueReminders();
    } catch (error) {
      console.error("Reminder cron failed:", error.message);
    }
  });
};
