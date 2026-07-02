import mongoose from "mongoose";
import { SkillGap } from "../models/SkillGap.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getSkillGapData = async (userIdValue, limit = 50) => {
  const userId = new mongoose.Types.ObjectId(userIdValue);
  return SkillGap.aggregate([
    { $match: { userId } },
    {
      $addFields: {
        gapCount: { $subtract: ["$timesRequested", "$timesMatched"] }
    }
  },
  { $sort: { gapCount: -1, timesRequested: -1, lastSeenAt: -1, skillName: 1 } },
    { $limit: limit }
  ]);
};

export const listSkillGaps = asyncHandler(async (req, res) => {
  const skillGaps = await getSkillGapData(req.user.id);

  res.json({ skillGaps });
});
