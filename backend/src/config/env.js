import dotenv from "dotenv";

dotenv.config();

const required = ["MONGODB_URI", "JWT_ACCESS_SECRET", "REFRESH_TOKEN_SECRET"];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const parseOrigins = (value) =>
  value
    ? value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)
    : [];

const buildCorsOrigins = () => {
  const configuredOrigins = parseOrigins(
    process.env.CORS_ORIGINS || process.env.FRONTEND_URL || process.env.CLIENT_URL || "http://localhost:5173"
  );

  if (process.env.NODE_ENV === "production") {
    return configuredOrigins;
  }

  return Array.from(
    new Set([
      ...configuredOrigins,
      process.env.FRONTEND_URL || process.env.CLIENT_URL || "http://localhost:5173",
      "http://localhost:5173",
      "http://127.0.0.1:5173"
    ])
  );
};

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  isProduction: process.env.NODE_ENV === "production",
  port: Number(process.env.PORT || 5000),
  apiBaseUrl: process.env.API_BASE_URL || "http://localhost:5000",
  clientUrl: process.env.FRONTEND_URL || process.env.CLIENT_URL || "http://localhost:5173",
  corsOrigins: buildCorsOrigins(),
  mongoUri: process.env.MONGODB_URI,
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL || "15m",
  refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET,
  refreshTokenTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS || 30),
  deadlineReminderLeadDays: Number(process.env.DEADLINE_REMINDER_LEAD_DAYS || 2),
  cookieName: process.env.COOKIE_NAME || "careertrack_refresh",
  cookieDomain: process.env.COOKIE_DOMAIN || undefined,
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.EMAIL_USER || process.env.SMTP_USER,
    pass: process.env.EMAIL_PASS || process.env.SMTP_PASS,
    emailUserConfigured: Boolean(process.env.EMAIL_USER),
    emailPassConfigured: Boolean(process.env.EMAIL_PASS),
    frontendUrlConfigured: Boolean(process.env.FRONTEND_URL || process.env.CLIENT_URL),
    from: process.env.EMAIL_FROM || "CareerTrack AI <no-reply@careertrack.ai>"
  },
  geminiApiKey: process.env.GEMINI_API_KEY,
  geminiModel: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET
  }
};
