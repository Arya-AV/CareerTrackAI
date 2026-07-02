import { Application } from "../models/Application.js";
import { InterviewRound } from "../models/InterviewRound.js";
import { OARecord } from "../models/OARecord.js";
import { Referral } from "../models/Referral.js";
import { Reminder } from "../models/Reminder.js";
import { User } from "../models/User.js";
import { env } from "../config/env.js";
import { sendReminderEmail } from "./email.service.js";
import { getCompanyData } from "../controllers/company.controller.js";
import { getMomentumData } from "../controllers/dashboard.controller.js";

const MAX_ATTEMPTS = 3;

const appLink = (applicationId) => `${env.clientUrl}/app/applications/${applicationId}`;
const toApplyLink = () => `${env.clientUrl}/app/to-apply`;

const formatDateTime = (date, timezone = "Asia/Calcutta") =>
  new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone
  }).format(date);

const reminderCopy = ({ type, application, source, user }) => {
  const company = application?.companyName || source.companyName || source.company || "Company";
  const role = application?.role || source.roleTitle || source.role || "Role";
  const link = source.jobLink && !application ? toApplyLink() : appLink(application?._id || source.applicationId);
  const timeZone = user.preferences?.timezone || "Asia/Calcutta";

  if (type === "OA_TOMORROW") {
    return {
      subject: `OA tomorrow: ${company} - ${role}`,
      message: `Your OA for ${company} (${role}) is scheduled for ${formatDateTime(source.scheduledAt, timeZone)}.`,
      link
    };
  }

  if (type === "INTERVIEW_2_HOURS") {
    return {
      subject: `Interview in 2 hours: ${company} - ${role}`,
      message: `Your ${source.roundType || "interview"} round for ${company} (${role}) starts at ${formatDateTime(source.scheduledAt, timeZone)}.`,
      link
    };
  }

  if (type === "INTERVIEW_PREP") {
    return {
      subject: `Prep reminder: ${company} - ${role}`,
      message: `Prep for your ${source.roundType || "interview"} round with ${company} (${role}) before ${formatDateTime(source.scheduledAt, timeZone)}.`,
      link
    };
  }

  if (type === "APPLICATION_FOLLOW_UP") {
    return {
      subject: `Follow up: ${company} - ${role}`,
      message: `Send a concise follow-up for your ${company} (${role}) application.`,
      link
    };
  }

  if (type === "TO_APPLY_CHECK") {
    return {
      subject: `Still planning to apply? ${company}`,
      message: `You saved ${company}${role ? ` (${role})` : ""} to apply later. Review the posting and decide whether to apply.`,
      link
    };
  }

  if (type === "TO_APPLY_DEADLINE") {
    return {
      subject: `Job deadline tomorrow: ${company}`,
      message: `The saved posting for ${company}${role ? ` (${role})` : ""} has a deadline on ${formatDateTime(source.deadlineDate, timeZone)}.`,
      link
    };
  }

  if (type === "REFERRAL_FOLLOW_UP") {
    return {
      subject: `Referral follow-up due: ${company}`,
      message: `Follow up with ${source.referrerName} about your referral for ${company}${role ? ` (${role})` : ""}.`,
      link
    };
  }

  return {
    subject: `Application deadline approaching: ${company} - ${role}`,
    message: `The application deadline for ${company} (${role}) is ${formatDateTime(application.deadline, timeZone)}.`,
    link
  };
};

const upsertReminder = async ({ user, application, source, type, relatedEntityType, scheduledFor }) => {
  if (!scheduledFor || scheduledFor <= new Date()) {
    return null;
  }

  const copy = reminderCopy({ type, application, source, user });

  return Reminder.findOneAndUpdate(
    {
      relatedEntityType,
      relatedEntityId: source._id,
      type,
      status: { $in: ["Pending", "Failed"] }
    },
    {
      $set: {
        userId: user._id,
        applicationId: application?._id || source.applicationId,
        scheduledFor,
        emailTo: user.email,
        subject: copy.subject,
        message: copy.message,
        link: copy.link,
        payload: {
          companyName: application?.companyName || source.company,
          role: application?.role || source.roleTitle,
          sourceScheduledAt: source.scheduledAt,
          deadline: application?.deadline || source.deadlineDate,
          referrerName: source.referrerName,
          jobLink: source.jobLink
        },
        status: "Pending",
        errorMessage: undefined,
        nextRetryAt: undefined
      },
      $setOnInsert: {
        relatedEntityType,
        relatedEntityId: source._id,
        attempts: 0
      }
    },
    { upsert: true, new: true }
  );
};

const getUserAndApplication = async (userId, applicationId) => {
  const [user, application] = await Promise.all([
    User.findById(userId),
    applicationId ? Application.findOne({ _id: applicationId, userId }) : null
  ]);

  return { user, application };
};

export const scheduleOAReminder = async (oa) => {
  const { user, application } = await getUserAndApplication(oa.userId, oa.applicationId);
  if (!user || !application) return null;

  return upsertReminder({
    user,
    application,
    source: oa,
    type: "OA_TOMORROW",
    relatedEntityType: "OARecord",
    scheduledFor: new Date(oa.scheduledAt.getTime() - 24 * 60 * 60 * 1000)
  });
};

export const scheduleInterviewReminder = async (interview) => {
  const { user, application } = await getUserAndApplication(interview.userId, interview.applicationId);
  if (!user || !application) return null;

  return upsertReminder({
    user,
    application,
    source: interview,
    type: "INTERVIEW_2_HOURS",
    relatedEntityType: "InterviewRound",
    scheduledFor: new Date(interview.scheduledAt.getTime() - 2 * 60 * 60 * 1000)
  });
};

export const scheduleReferralReminder = async (referral) => {
  const { user, application } = await getUserAndApplication(referral.userId, referral.applicationId);
  if (!user) return null;

  let followUpDate = referral.followUpDate;
  if (!followUpDate && referral.messageHistory?.length) {
    const lastContact = referral.messageHistory.reduce((latest, message) =>
      !latest || message.sentAt > latest ? message.sentAt : latest
    , null);
    followUpDate = new Date(lastContact.getTime() + (referral.followUpAfterDays || 7) * 24 * 60 * 60 * 1000);
  }

  return upsertReminder({
    user,
    application,
    source: { ...referral.toObject(), followUpDate },
    type: "REFERRAL_FOLLOW_UP",
    relatedEntityType: "Referral",
    scheduledFor: followUpDate
  });
};

export const scheduleDeadlineReminder = async (application) => {
  if (!application.deadline) return null;

  const user = await User.findById(application.userId);
  if (!user) return null;

  return upsertReminder({
    user,
    application,
    source: application,
    type: "DEADLINE_APPROACHING",
    relatedEntityType: "Application",
    scheduledFor: new Date(application.deadline.getTime() - env.deadlineReminderLeadDays * 24 * 60 * 60 * 1000)
  });
};

export const scheduleApplicationReminders = async (application) => scheduleDeadlineReminder(application);

export const scheduleToApplyReminders = async (entry) => {
  const user = await User.findById(entry.userId);
  if (!user) return [];

  const reminders = [];
  const checkReminder = await upsertReminder({
    user,
    application: null,
    source: entry,
    type: "TO_APPLY_CHECK",
    relatedEntityType: "ToApply",
    scheduledFor: addDays(entry.createdAt || new Date(), 3)
  });

  if (checkReminder) reminders.push(checkReminder);

  if (entry.deadlineDate) {
    const deadlineReminder = await upsertReminder({
      user,
      application: null,
      source: entry,
      type: "TO_APPLY_DEADLINE",
      relatedEntityType: "ToApply",
      scheduledFor: addDays(entry.deadlineDate, -1)
    });

    if (deadlineReminder) reminders.push(deadlineReminder);
  }

  return reminders;
};

export const cancelToApplyReminders = (entryId) =>
  Reminder.updateMany(
    {
      relatedEntityType: "ToApply",
      relatedEntityId: entryId,
      status: { $in: ["Pending", "Failed"] }
    },
    { $set: { status: "Cancelled" } }
  );

const addDays = (date, days) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
const addHours = (date, hours) => new Date(date.getTime() + hours * 60 * 60 * 1000);

const compactFutureSuggestions = (suggestions) =>
  suggestions
    .filter((suggestion) => suggestion.scheduledFor && suggestion.scheduledFor > new Date())
    .slice(0, 3);

export const buildRuleBasedApplicationReminderSuggestions = (application) =>
  compactFutureSuggestions([
    {
      type: "APPLICATION_FOLLOW_UP",
      label: "Follow-up",
      scheduledFor: addDays(application.appliedDate || new Date(), 7),
      reasoning: "Rule-based default: follow up 7 days after applying."
    },
    application.deadline
      ? {
          type: "DEADLINE_APPROACHING",
          label: "Deadline",
          scheduledFor: addDays(application.deadline, -env.deadlineReminderLeadDays),
          reasoning: `Rule-based default: remind ${env.deadlineReminderLeadDays} days before the application deadline.`
        }
      : null
  ].filter(Boolean));

export const buildRuleBasedInterviewReminderSuggestions = (interview) =>
  compactFutureSuggestions([
    {
      type: "INTERVIEW_PREP",
      label: "Prep",
      scheduledFor: addDays(interview.scheduledAt, -1),
      reasoning: "Rule-based default: start focused prep 1 day before the interview."
    },
    {
      type: "INTERVIEW_2_HOURS",
      label: "Starts soon",
      scheduledFor: addHours(interview.scheduledAt, -2),
      reasoning: "Rule-based default: remind 2 hours before the interview starts."
    }
  ]);

export const scheduleAcceptedReminderSuggestions = async ({
  userId,
  application,
  source,
  relatedEntityType,
  suggestions = []
}) => {
  if (!suggestions.length) return [];

  const user = await User.findById(userId);
  if (!user || !application) return [];

  const reminders = [];
  for (const suggestion of suggestions) {
    const reminder = await upsertReminder({
      user,
      application,
      source,
      type: suggestion.type,
      relatedEntityType,
      scheduledFor: suggestion.scheduledFor
    });

    if (reminder) {
      reminder.payload = {
        ...(reminder.payload || {}),
        smartSuggestionReasoning: suggestion.reasoning || ""
      };
      await reminder.save();
      reminders.push(reminder);
    }
  }

  return reminders;
};

const refineSuggestionReasonsWithGemini = async ({ suggestions, application, company, momentum }) => {
  if (!env.geminiApiKey || !suggestions.length) return suggestions;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${env.geminiModel}:generateContent?key=${env.geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text:
                  "Return only JSON. You refine reminder suggestion reasoning for a job tracker. Keep the same type, label, and scheduledFor values. Return an array of 1-3 objects with type, label, scheduledFor, reasoning."
              }
            ]
          },
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: JSON.stringify({
                    application: {
                      companyName: application.companyName,
                      role: application.role,
                      appliedDate: application.appliedDate,
                      deadline: application.deadline
                    },
                    company: {
                      applicationCount: company?.applicationCount || 0,
                      averageResponseTimeHours: company?.averageResponseTimeHours ?? null,
                      currentStage: company?.currentStage || null
                    },
                    momentum: {
                      score: momentum?.current?.momentumScore,
                      nudge: momentum?.nudge || null
                    },
                    suggestions
                  })
                }
              ]
            }
          ],
          generationConfig: { temperature: 0.2, responseMimeType: "application/json" }
        })
      }
    );

    if (!response.ok) return suggestions;
    const payload = await response.json();
    const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text).join("") || "[]";
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) return suggestions;

    return suggestions.map((suggestion) => {
      const refined = parsed.find((item) => item.type === suggestion.type);
      return refined?.reasoning ? { ...suggestion, reasoning: refined.reasoning } : suggestion;
    });
  } catch (_error) {
    return suggestions;
  }
};

export const suggestSmartReminders = async ({ userId, applicationId, interviewRoundId }) => {
  let application;
  let suggestions;

  if (applicationId) {
    application = await Application.findOne({ _id: applicationId, userId });
    if (!application) return null;
    suggestions = buildRuleBasedApplicationReminderSuggestions(application);
  } else {
    const interview = await InterviewRound.findOne({ _id: interviewRoundId, userId });
    if (!interview) return null;
    application = await Application.findOne({ _id: interview.applicationId, userId });
    if (!application) return null;
    suggestions = buildRuleBasedInterviewReminderSuggestions(interview);
  }

  const [company, momentum] = await Promise.all([
    getCompanyData({ userId, companyName: application.companyName }).catch(() => null),
    getMomentumData(userId).catch(() => null)
  ]);

  const enriched = suggestions.map((suggestion) => {
    if (suggestion.type === "APPLICATION_FOLLOW_UP" && company?.averageResponseTimeHours) {
      const days = Math.max(1, Math.round(company.averageResponseTimeHours / 24));
      return {
        ...suggestion,
        reasoning: `Company history shows an average response time of about ${days} day${days === 1 ? "" : "s"}; this follow-up timing keeps you visible without feeling too early.`
      };
    }

    if (suggestion.type === "APPLICATION_FOLLOW_UP" && momentum?.nudge) {
      return { ...suggestion, reasoning: momentum.nudge };
    }

    return suggestion;
  });

  return {
    source: env.geminiApiKey ? "ai_enhanced" : "rule_based",
    suggestions: await refineSuggestionReasonsWithGemini({
      suggestions: enriched,
      application,
      company,
      momentum
    })
  };
};

const htmlTemplate = (reminder) => `
  <div style="font-family:Arial,sans-serif;line-height:1.5;color:#17201a">
    <h2>${reminder.subject}</h2>
    <p>${reminder.message}</p>
    <p><a href="${reminder.link}">Open in CareerTrack AI</a></p>
  </div>
`;

export const processDueReminders = async ({ now = new Date(), limit = 50 } = {}) => {
  const dueQuery = {
    $or: [
      { status: "Pending", scheduledFor: { $lte: now } },
      { status: "Failed", nextRetryAt: { $lte: now }, attempts: { $lt: MAX_ATTEMPTS } }
    ]
  };

  const due = await Reminder.find(dueQuery).sort({ scheduledFor: 1 }).limit(limit);
  const results = [];

  for (const item of due) {
    const reminder = await Reminder.findOneAndUpdate(
      {
        _id: item._id,
        status: { $in: ["Pending", "Failed"] },
        sentAt: { $exists: false }
      },
      {
        $set: { status: "Processing", lastAttemptAt: now },
        $inc: { attempts: 1 }
      },
      { new: true }
    );

    if (!reminder) continue;

    try {
      await sendReminderEmail({
        to: reminder.emailTo,
        subject: reminder.subject,
        text: `${reminder.message}\n\nOpen in CareerTrack AI: ${reminder.link}`,
        html: htmlTemplate(reminder)
      });

      reminder.status = "Sent";
      reminder.sentAt = new Date();
      reminder.errorMessage = undefined;
      reminder.nextRetryAt = undefined;
      await reminder.save();
      results.push({ id: reminder._id.toString(), status: "Sent" });
    } catch (error) {
      const delayMinutes = reminder.attempts === 1 ? 5 : reminder.attempts === 2 ? 30 : 120;
      reminder.status = reminder.attempts >= MAX_ATTEMPTS ? "Failed" : "Failed";
      reminder.errorMessage = error.message;
      reminder.nextRetryAt =
        reminder.attempts >= MAX_ATTEMPTS ? undefined : new Date(Date.now() + delayMinutes * 60 * 1000);
      await reminder.save();
      console.error(`Reminder ${reminder._id} failed:`, error.message);
      results.push({ id: reminder._id.toString(), status: "Failed", error: error.message });
    }
  }

  return results;
};
