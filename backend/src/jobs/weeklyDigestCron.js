import cron from "node-cron";
import { generateWeeklyDigest, getUsersDueForWeeklyDigest } from "../services/weeklyDigest.service.js";

export const processDueWeeklyDigests = async ({ now = new Date(), limit = 25 } = {}) => {
  const dueUserIds = await getUsersDueForWeeklyDigest({ now, limit });
  const results = [];

  for (const userId of dueUserIds) {
    try {
      const { digest, cached } = await generateWeeklyDigest({ userId, now });
      results.push({ userId: userId.toString(), digestId: digest._id.toString(), cached });
    } catch (error) {
      console.error(`Weekly digest failed for user ${userId}:`, error.message);
      results.push({ userId: userId.toString(), error: error.message });
    }
  }

  return results;
};

export const startWeeklyDigestCron = () => {
  cron.schedule("0 9 * * 1", async () => {
    try {
      await processDueWeeklyDigests();
    } catch (error) {
      console.error("Weekly digest cron failed:", error.message);
    }
  });
};
