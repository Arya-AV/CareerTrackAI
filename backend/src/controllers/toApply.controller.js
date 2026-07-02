import { Application } from "../models/Application.js";
import { Reminder } from "../models/Reminder.js";
import { ToApply } from "../models/ToApply.js";
import {
  cancelToApplyReminders,
  scheduleApplicationReminders,
  scheduleToApplyReminders
} from "../services/reminder.service.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const findOwnedToApply = async (id, userId) => {
  const entry = await ToApply.findOne({ _id: id, userId });
  if (!entry) throw new ApiError(404, "To Apply entry not found");
  return entry;
};

const attachReminders = async (entries) => {
  const ids = entries.map((entry) => entry._id);
  const reminders = await Reminder.find({
    relatedEntityType: "ToApply",
    relatedEntityId: { $in: ids }
  }).sort({ scheduledFor: 1 });

  const reminderMap = new Map();
  reminders.forEach((reminder) => {
    const key = reminder.relatedEntityId.toString();
    if (!reminderMap.has(key)) reminderMap.set(key, []);
    reminderMap.get(key).push(reminder);
  });

  return entries.map((entry) => ({
    ...entry.toObject(),
    reminders: reminderMap.get(entry._id.toString()) || []
  }));
};

export const createToApply = asyncHandler(async (req, res) => {
  const entry = await ToApply.create({
    ...req.body,
    userId: req.user.id
  });
  const reminders = await scheduleToApplyReminders(entry);

  res.status(201).json({ entry: { ...entry.toObject(), reminders } });
});

export const listToApply = asyncHandler(async (req, res) => {
  const entries = await ToApply.find({
    userId: req.user.id,
    status: req.query.status
  })
    .sort({ deadlineDate: 1, createdAt: -1 })
    .limit(req.query.limit);

  res.json({ entries: await attachReminders(entries) });
});

export const updateToApply = asyncHandler(async (req, res) => {
  const entry = await findOwnedToApply(req.params.id, req.user.id);
  Object.assign(entry, req.body);
  await entry.save();

  if (entry.status === "pending") {
    await scheduleToApplyReminders(entry);
  } else {
    await cancelToApplyReminders(entry._id);
  }

  const [entryWithReminders] = await attachReminders([entry]);
  res.json({ entry: entryWithReminders });
});

export const deleteToApply = asyncHandler(async (req, res) => {
  const entry = await findOwnedToApply(req.params.id, req.user.id);
  await cancelToApplyReminders(entry._id);
  await entry.deleteOne();

  res.status(204).send();
});

export const convertToApplication = asyncHandler(async (req, res) => {
  const entry = await findOwnedToApply(req.params.id, req.user.id);

  const application = await Application.create({
    userId: req.user.id,
    companyName: entry.companyName,
    role: entry.roleTitle || "Role not set",
    appliedDate: new Date(),
    deadline: entry.deadlineDate,
    status: "Applied",
    source: "Other",
    jobLink: entry.jobLink,
    notes: entry.notes || ""
  });

  entry.status = "applied";
  await entry.save();
  await cancelToApplyReminders(entry._id);
  await scheduleApplicationReminders(application);

  res.status(201).json({ application, entry });
});
