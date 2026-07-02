import { generateDigestNow, getLatestDigest } from "../services/weeklyDigest.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const latestDigest = asyncHandler(async (req, res) => {
  const digest = await getLatestDigest(req.user.id);
  res.json({ digest });
});

export const generateDigest = asyncHandler(async (req, res) => {
  const { digest, cached } = await generateDigestNow(req.user.id);
  res.status(201).json({ digest, cached });
});
