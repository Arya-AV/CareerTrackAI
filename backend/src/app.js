import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { corsMiddleware } from "./config/cors.js";
import { env } from "./config/env.js";
import authRoutes from "./routes/auth.routes.js";
import applicationRoutes from "./routes/application.routes.js";
import aiRoutes from "./routes/ai.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import digestRoutes from "./routes/digest.routes.js";
import noteRoutes from "./routes/note.routes.js";
import reminderRoutes from "./routes/reminder.routes.js";
import contactRoutes from "./routes/contact.routes.js";
import channelPostingRoutes from "./routes/channelPosting.routes.js";
import companyRoutes from "./routes/company.routes.js";
import resumeVersionRoutes from "./routes/resumeVersion.routes.js";
import skillGapRoutes from "./routes/skillGap.routes.js";
import toApplyRoutes from "./routes/toApply.routes.js";
import trackerRoutes from "./routes/tracker.routes.js";
import userRoutes from "./routes/user.routes.js";
import { errorMiddleware } from "./middleware/error.middleware.js";

export const app = express();

app.set("trust proxy", 1);

app.use(helmet());
app.use(corsMiddleware);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

if (!env.isProduction) {
  app.use(morgan("dev"));
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "careertrack-ai-backend" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/digests", digestRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/channel-postings", channelPostingRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/resume-versions", resumeVersionRoutes);
app.use("/api/skill-gaps", skillGapRoutes);
app.use("/api/to-apply", toApplyRoutes);
app.use("/api", trackerRoutes);
app.use("/api/reminders", reminderRoutes);

app.use(errorMiddleware);
