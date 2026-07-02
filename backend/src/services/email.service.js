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
