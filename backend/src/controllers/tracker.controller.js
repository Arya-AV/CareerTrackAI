import { Application } from "../models/Application.js";
import { Contact } from "../models/Contact.js";
import { InterviewRound } from "../models/InterviewRound.js";
import { Note } from "../models/Note.js";
import { OARecord } from "../models/OARecord.js";
import { Referral } from "../models/Referral.js";
import { extractInterviewReplayNotes } from "../services/ai.service.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  scheduleAcceptedReminderSuggestions,
  scheduleInterviewReminder,
  scheduleOAReminder,
  scheduleReferralReminder
} from "../services/reminder.service.js";

const findApplication = async (applicationId, userId) => {
  const application = await Application.findOne({ _id: applicationId, userId });
  if (!application) throw new ApiError(404, "Application not found");
  return application;
};

const findInterviewRound = async (interviewRoundId, userId) => {
  const interview = await InterviewRound.findOne({ _id: interviewRoundId, userId });
  if (!interview) throw new ApiError(404, "Interview round not found");
  return interview;
};

const findOARecord = async (oaId, userId) => {
  const oa = await OARecord.findOne({ _id: oaId, userId });
  if (!oa) throw new ApiError(404, "OA record not found");
  return oa;
};

export const createOA = asyncHandler(async (req, res) => {
  await findApplication(req.params.applicationId, req.user.id);
  const oa = await OARecord.create({
    ...req.body,
    userId: req.user.id,
    applicationId: req.params.applicationId
  });
  const reminder = await scheduleOAReminder(oa);
  res.status(201).json({ oa, reminder });
});

export const listOAs = asyncHandler(async (req, res) => {
  await findApplication(req.params.applicationId, req.user.id);
  const oas = await OARecord.find({
    userId: req.user.id,
    applicationId: req.params.applicationId
  }).sort({ scheduledAt: -1, createdAt: -1 });

  res.json({ oas });
});

export const deleteOA = asyncHandler(async (req, res) => {
  const oa = await findOARecord(req.params.oaId, req.user.id);
  await oa.deleteOne();
  res.status(204).send();
});

export const createInterview = asyncHandler(async (req, res) => {
  const application = await findApplication(req.params.applicationId, req.user.id);
  const { reminderSuggestions, ...interviewBody } = req.body;
  const interview = await InterviewRound.create({
    ...interviewBody,
    userId: req.user.id,
    applicationId: req.params.applicationId
  });
  const reminders = reminderSuggestions
    ? await scheduleAcceptedReminderSuggestions({
        userId: req.user.id,
        application,
        source: interview,
        relatedEntityType: "InterviewRound",
        suggestions: reminderSuggestions
      })
    : [await scheduleInterviewReminder(interview)].filter(Boolean);
  res.status(201).json({ interview, reminders });
});

export const listInterviews = asyncHandler(async (req, res) => {
  await findApplication(req.params.applicationId, req.user.id);
  const interviews = await InterviewRound.find({
    userId: req.user.id,
    applicationId: req.params.applicationId
  }).sort({ scheduledAt: -1 });

  res.json({ interviews });
});

export const createReferral = asyncHandler(async (req, res) => {
  if (req.body.applicationId) {
    await findApplication(req.body.applicationId, req.user.id);
  }

  let contact = null;
  if (req.body.contactId) {
    contact = await Contact.findOne({ _id: req.body.contactId, userId: req.user.id });
    if (!contact) throw new ApiError(404, "Contact not found");
  }

  const referrerName = req.body.referrerName || contact?.name;
  const company = req.body.company || contact?.company;
  const linkedInProfile = req.body.linkedInProfile || contact?.linkedinUrl || "";

  if (!referrerName || !company) {
    throw new ApiError(400, "Referral requires either contactId or both referrerName and company");
  }

  const messageHistory = req.body.message
    ? [{ message: req.body.message, sentAt: new Date(), direction: "Sent", channel: "LinkedIn" }]
    : [];

  const referral = await Referral.create({
    ...req.body,
    referrerName,
    company,
    linkedInProfile,
    userId: req.user.id,
    messageHistory
  });
  const reminder = await scheduleReferralReminder(referral);
  res.status(201).json({ referral, reminder });
});

export const extractInterviewReplay = asyncHandler(async (req, res) => {
  const interview = await findInterviewRound(req.params.interviewRoundId, req.user.id);
  const { items, cached } = await extractInterviewReplayNotes({
    userId: req.user.id,
    interviewRoundId: interview._id.toString(),
    text: req.body.text
  });

  res.json({ items, cached });
});

export const confirmInterviewReplay = asyncHandler(async (req, res) => {
  const interview = await findInterviewRound(req.params.interviewRoundId, req.user.id);
  const application = await Application.findOne({ _id: interview.applicationId, userId: req.user.id });

  const notes = await Note.insertMany(
    req.body.items.map((item) => ({
      userId: req.user.id,
      applicationId: interview.applicationId,
      type: item.tag,
      title: item.question,
      content: item.answerSummary,
      company: application?.companyName || "",
      role: application?.role || "",
      tags: ["Interview Replay"],
      sourceType: "Interview",
      sourceId: interview._id
    }))
  );

  res.status(201).json({ notes });
});
