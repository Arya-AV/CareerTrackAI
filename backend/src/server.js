import { app } from "./app.js";
import { connectDb } from "./config/db.js";
import { env } from "./config/env.js";
import { startReminderCron } from "./jobs/reminderCron.js";
import { startWeeklyDigestCron } from "./jobs/weeklyDigestCron.js";

const start = async () => {
  await connectDb();

  app.listen(env.port, () => {
    console.log(`CareerTrack AI API listening on port ${env.port}`);
  });

  startReminderCron();
  startWeeklyDigestCron();
};

start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
