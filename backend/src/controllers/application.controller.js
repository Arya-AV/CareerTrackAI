import { Application } from "../models/Application.js";
import { AIAnalysis } from "../models/AIAnalysis.js";
import { InterviewRound } from "../models/InterviewRound.js";
import { Note } from "../models/Note.js";
import { OARecord } from "../models/OARecord.js";
import { Reminder } from "../models/Reminder.js";
import { ResumeVersion } from "../models/ResumeVersion.js";
import {
  scheduleAcceptedReminderSuggestions,
  scheduleApplicationReminders
} from "../services/reminder.service.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const findOwnedApplication = async (id, userId) => {
  const application = await Application.findOne({ _id: id, userId });
  if (!application) {
    throw new ApiError(404, "Application not found");
  }

  return application;
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeResumeVersion = async (body, userId) => {
  if (!body.resumeVersionId) {
    delete body.resumeVersionId;
    return;
  }

  const resumeVersion = await ResumeVersion.findOne({
    _id: body.resumeVersionId,
    userId,
    archived: false
  });

  if (!resumeVersion) {
    throw new ApiError(404, "Resume version not found");
  }
};

const requireRejectionStage = (body) => {
  if (body.status === "Rejected" && !body.rejectionStage) {
    throw new ApiError(400, "rejectionStage is required when status is Rejected");
  }
};

export const listApplications = asyncHandler(async (req, res) => {
  const { status, search, company, location, source, page, limit } = req.query;
  const filter = { userId: req.user.id };

  if (status) {
    filter.status = status;
  }

  if (source) {
    filter.source = source;
  }

  if (company) {
    filter.companyName = new RegExp(escapeRegex(company), "i");
  }

  if (location) {
    filter.location = new RegExp(escapeRegex(location), "i");
  }

  if (search) {
    const searchRegex = new RegExp(escapeRegex(search), "i");
    filter.$or = [
      { companyName: searchRegex },
      { role: searchRegex },
      { location: searchRegex },
      { source: searchRegex },
      { notes: searchRegex },
      { jobDescriptionText: searchRegex }
    ];
  }

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Application.find(filter).sort({ appliedDate: -1, createdAt: -1 }).skip(skip).limit(limit),
    Application.countDocuments(filter)
  ]);

  res.json({
    items,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

export const createApplication = asyncHandler(async (req, res) => {
  await normalizeResumeVersion(req.body, req.user.id);
  const { reminderSuggestions, ...applicationBody } = req.body;
  const application = await Application.create({
    ...applicationBody,
    userId: req.user.id
  });
  const reminders = reminderSuggestions
    ? await scheduleAcceptedReminderSuggestions({
        userId: req.user.id,
        application,
        source: application,
        relatedEntityType: "Application",
        suggestions: reminderSuggestions
      })
    : [await scheduleApplicationReminders(application)].filter(Boolean);

  res.status(201).json({ application, reminders });
});

export const getApplication = asyncHandler(async (req, res) => {
  const application = await findOwnedApplication(req.params.id, req.user.id);
  res.json({ application });
});

export const listApplicationAiAnalyses = asyncHandler(async (req, res) => {
  await findOwnedApplication(req.params.applicationId, req.user.id);

  const analyses = await AIAnalysis.find({
    userId: req.user.id,
    applicationId: req.params.applicationId,
    type: { $in: ["JD_ANALYSIS", "RESUME_MATCH"] }
  })
    .sort({ createdAt: -1 })
    .select("applicationId type result model createdAt");

  res.json({ analyses });
});

export const listApplicationNotes = asyncHandler(async (req, res) => {
  await findOwnedApplication(req.params.applicationId, req.user.id);

  const notes = await Note.find({
    userId: req.user.id,
    applicationId: req.params.applicationId
  }).sort({ createdAt: -1 });

  res.json({ notes });
});

export const updateApplication = asyncHandler(async (req, res) => {
  const application = await findOwnedApplication(req.params.id, req.user.id);
  await normalizeResumeVersion(req.body, req.user.id);
  requireRejectionStage(req.body);
  Object.assign(application, req.body);
  await application.save();
  await scheduleApplicationReminders(application);

  res.json({ application });
});

export const deleteApplication = asyncHandler(async (req, res) => {
  const application = await findOwnedApplication(req.params.id, req.user.id);
  await Promise.all([
    InterviewRound.deleteMany({ userId: req.user.id, applicationId: application._id }),
    Note.deleteMany({ userId: req.user.id, applicationId: application._id }),
    OARecord.deleteMany({ userId: req.user.id, applicationId: application._id }),
    Reminder.deleteMany({ userId: req.user.id, applicationId: application._id })
  ]);
  await application.deleteOne();

  res.status(204).send();
});

export const updateApplicationStatus = asyncHandler(async (req, res) => {
  const application = await findOwnedApplication(req.params.id, req.user.id);
  requireRejectionStage(req.body);
  application.status = req.body.status;

  if (req.body.status === "Rejected") {
    application.rejectionStage = req.body.rejectionStage;
    application.rejectionFeedback = req.body.rejectionFeedback || "";
  }

  await application.save();
  await scheduleApplicationReminders(application);

  res.json({ application });
});
