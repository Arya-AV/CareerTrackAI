import { Reminder } from "../models/Reminder.js";
import { suggestSmartReminders } from "../services/reminder.service.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const listReminders = asyncHandler(async (req, res) => {
  const filter = { userId: req.user.id };
  if (req.query.status) filter.status = req.query.status;

  const reminders = await Reminder.find(filter)
    .sort({ sentAt: -1, scheduledFor: -1 })
    .limit(req.query.limit);

  res.json({ reminders });
});

export const updateReminder = asyncHandler(async (req, res) => {
  const reminder = await Reminder.findOne({ _id: req.params.id, userId: req.user.id });

  if (!reminder) {
    throw new ApiError(404, "Reminder not found");
  }

  if (req.body.status === "Cancelled" && reminder.status !== "Pending") {
    throw new ApiError(400, "Only pending reminders can be cancelled");
  }

  reminder.status = req.body.status;
  if (req.body.status === "Cancelled") {
    reminder.errorMessage = "";
  }

  await reminder.save();
  res.json({ reminder });
});

export const suggestReminders = asyncHandler(async (req, res) => {
  const result = await suggestSmartReminders({
    userId: req.user.id,
    applicationId: req.body.applicationId,
    interviewRoundId: req.body.interviewRoundId
  });

  if (!result) {
    throw new ApiError(404, "Reminder source not found");
  }

  res.json(result);
});
