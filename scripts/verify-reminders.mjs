import mongoose from "mongoose";
import path from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: path.resolve("backend/.env") });

const { connectDb } = await import("../backend/src/config/db.js");
const { Application } = await import("../backend/src/models/Application.js");
const { Reminder } = await import("../backend/src/models/Reminder.js");
const { User } = await import("../backend/src/models/User.js");
const { scheduleDeadlineReminder, processDueReminders } = await import("../backend/src/services/reminder.service.js");

const stamp = Date.now();

await connectDb();

try {
  const user = new User({
    name: "Reminder Test User",
    email: process.env.SMTP_USER || `reminder.test.${stamp}@example.com`
  });
  await user.setPassword(`TestPass-${stamp}!`);
  await user.save();

  const application = await Application.create({
    userId: user._id,
    companyName: "Reminder Test Co",
    role: "Software Engineer Intern",
    location: "Remote",
    appliedDate: new Date(),
    deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 60 * 1000),
    status: "Applied",
    source: "LinkedIn"
  });

  const reminder = await scheduleDeadlineReminder(application);
  reminder.scheduledFor = new Date(Date.now() - 1000);
  await reminder.save();

  const firstRun = await processDueReminders({ now: new Date(), limit: 10 });
  const afterFirst = await Reminder.findById(reminder._id);
  const secondRun = await processDueReminders({ now: new Date(), limit: 10 });
  const afterSecond = await Reminder.findById(reminder._id);

  console.log(
    JSON.stringify(
      {
        userEmail: user.email,
        applicationId: application._id.toString(),
        reminderId: reminder._id.toString(),
        firstRun,
        secondRun,
        afterFirst: {
          status: afterFirst.status,
          attempts: afterFirst.attempts,
          sentAtPresent: Boolean(afterFirst.sentAt),
          subject: afterFirst.subject,
          link: afterFirst.link
        },
        afterSecond: {
          status: afterSecond.status,
          attempts: afterSecond.attempts,
          sentAtPresent: Boolean(afterSecond.sentAt)
        },
        sentOnce:
          afterFirst.status === "Sent" &&
          afterSecond.status === "Sent" &&
          afterSecond.attempts === afterFirst.attempts
      },
      null,
      2
    )
  );
} finally {
  await mongoose.disconnect();
}
