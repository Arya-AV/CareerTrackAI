import { ChannelPosting } from "../models/ChannelPosting.js";
import { ToApply } from "../models/ToApply.js";
import { extractChannelPosting } from "../services/ai.service.js";
import { scheduleToApplyReminders } from "../services/reminder.service.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const findOwnedPosting = async (id, userId) => {
  const posting = await ChannelPosting.findOne({ _id: id, userId });
  if (!posting) throw new ApiError(404, "Channel posting not found");
  return posting;
};

export const createChannelPosting = asyncHandler(async (req, res) => {
  const isAiAssisted = Object.keys(req.body).length === 1 && req.body.rawText;

  if (isAiAssisted) {
    const { extraction, cached } = await extractChannelPosting({
      userId: req.user.id,
      rawText: req.body.rawText
    });

    res.json({
      mode: "ai-assisted",
      cached,
      extraction: {
        ...extraction,
        rawText: req.body.rawText
      }
    });
    return;
  }

  const posting = await ChannelPosting.create({
    ...req.body,
    userId: req.user.id,
    addedAt: new Date()
  });

  res.status(201).json({ posting });
});

export const confirmChannelPosting = asyncHandler(async (req, res) => {
  const posting = await ChannelPosting.create({
    ...req.body,
    userId: req.user.id,
    addedAt: new Date()
  });

  res.status(201).json({ posting });
});

export const listChannelPostings = asyncHandler(async (req, res) => {
  const filter = { userId: req.user.id };

  if (req.query.company) filter.companyName = new RegExp(escapeRegex(req.query.company), "i");
  if (req.query.source) filter.sourceName = new RegExp(escapeRegex(req.query.source), "i");
  if (req.query.tag) filter.tags = new RegExp(escapeRegex(req.query.tag), "i");

  if (req.query.search) {
    const searchRegex = new RegExp(escapeRegex(req.query.search), "i");
    filter.$or = [
      { sourceName: searchRegex },
      { companyName: searchRegex },
      { roleTitle: searchRegex },
      { rawText: searchRegex },
      { tags: searchRegex }
    ];
  }

  const postings = await ChannelPosting.find(filter).sort({ addedAt: -1 }).limit(req.query.limit);
  res.json({ postings });
});

export const deleteChannelPosting = asyncHandler(async (req, res) => {
  const posting = await findOwnedPosting(req.params.id, req.user.id);
  await posting.deleteOne();

  res.status(204).send();
});

export const convertPostingToToApply = asyncHandler(async (req, res) => {
  const posting = await findOwnedPosting(req.params.id, req.user.id);

  if (!posting.jobLink) {
    throw new ApiError(400, "A job link is required to move this posting to To Apply.");
  }

  const entry = await ToApply.create({
    userId: req.user.id,
    companyName: posting.companyName,
    jobLink: posting.jobLink,
    roleTitle: posting.roleTitle || "",
    notes: posting.rawText || "",
    status: "pending"
  });
  const reminders = await scheduleToApplyReminders(entry);

  res.status(201).json({ entry: { ...entry.toObject(), reminders }, posting });
});
