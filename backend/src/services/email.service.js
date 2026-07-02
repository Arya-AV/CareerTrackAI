import nodemailer from "nodemailer";
import { env } from "../config/env.js";

const hasSmtpConfig = () => env.smtp.host && env.smtp.user && env.smtp.pass;

const usingGmailService = () =>
  Boolean(env.smtp.user && env.smtp.pass && (!env.smtp.host || env.smtp.host === "smtp.gmail.com"));

const logEmailConfig = () => {
  console.log("Email config:", {
    EMAIL_USER_exists: env.smtp.emailUserConfigured,
    EMAIL_PASS_exists: env.smtp.emailPassConfigured,
    FRONTEND_URL_exists: env.smtp.frontendUrlConfigured,
    transport: usingGmailService()
      ? { service: "gmail" }
      : {
          host: env.smtp.host || null,
          port: env.smtp.port,
          secure: env.smtp.secure
        }
  });
};

const createTransporter = () => {
  if (usingGmailService()) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: env.smtp.user,
        pass: env.smtp.pass
      }
    });
  }

  return nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth: {
      user: env.smtp.user,
      pass: env.smtp.pass
    }
  });
};

export const sendPasswordResetEmail = async ({ to, resetUrl }) => {
  logEmailConfig();

  if (!hasSmtpConfig()) {
    if (!env.isProduction) {
      console.log(`Password reset URL for ${to}: ${resetUrl}`);
      return;
    }

    throw new Error("SMTP is not configured");
  }

  const transporter = createTransporter();
  await transporter.sendMail({
    from: env.smtp.from,
    to,
    subject: "Reset your CareerTrack AI password",
    text: `Reset your password using this link: ${resetUrl}`,
    html: `<p>Reset your password using this link:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`
  });
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
