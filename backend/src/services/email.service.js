import nodemailer from "nodemailer";
import { env } from "../config/env.js";

const hasSmtpConfig = () => env.smtp.host && env.smtp.user && env.smtp.pass;

const isGmailSmtp = () => !env.smtp.host || env.smtp.host === "smtp.gmail.com";

const transportConfig = () => {
  if (isGmailSmtp()) {
    return {
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: env.smtp.user,
        pass: env.smtp.pass
      }
    };
  }

  return {
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth: {
      user: env.smtp.user,
      pass: env.smtp.pass
    }
  };
};

const logEmailConfig = () => {
  const config = transportConfig();
  console.log("Email config:", {
    EMAIL_USER_exists: env.smtp.emailUserConfigured,
    EMAIL_PASS_exists: env.smtp.emailPassConfigured,
    FRONTEND_URL_exists: env.smtp.frontendUrlConfigured,
    transport: {
      host: config.host,
      port: config.port,
      secure: config.secure
    }
  });
};

const createTransporter = () => nodemailer.createTransport(transportConfig());

export const sendPasswordResetEmail = async ({ to, resetUrl }) => {
  console.log("Password reset email config:", {
    RESEND_API_KEY_exists: env.resend.apiKeyConfigured,
    FRONTEND_URL_exists: env.resend.frontendUrlConfigured,
    provider: "resend",
    from: env.resend.from
  });

  if (!env.resend.apiKey) {
    if (!env.isProduction) {
      console.log(`Password reset email skipped in development because RESEND_API_KEY is not configured. Recipient: ${to}`);
      return;
    }

    throw new Error("RESEND_API_KEY is not configured");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.resend.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: env.resend.from,
      to,
      subject: "Reset your CareerTrack AI password",
      text: `Reset your password using this link: ${resetUrl}`,
      html: `<p>Reset your password using this link:</p><p><a href="${resetUrl}">Reset your password</a></p>`
    })
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error("Password reset email failed via Resend:", {
      status: response.status,
      message: payload.message || payload.error || "Unknown Resend error"
    });
    throw new Error(payload.message || payload.error || "Resend email request failed");
  }

  console.log("Password reset email sent via Resend:", {
    recipient: to,
    id: payload.id || null
  });

  return payload;
};

export const sendReminderEmail = async ({ to, subject, text, html }) => {
  logEmailConfig();

  if (!hasSmtpConfig()) {
    if (!env.isProduction) {
      console.log(`Reminder email to ${to}: ${subject}\n${text}`);
      return { messageId: "dev-log-only" };
    }

    throw new Error("SMTP is not configured");
  }

  const transporter = createTransporter();
  return transporter.sendMail({
    from: env.smtp.from,
    to,
    subject,
    text,
    html
  });
};
