import { analyzeJobDescription, matchResumeToJobDescription } from "../services/ai.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const analyzeJd = asyncHandler(async (req, res) => {
  const { analysis, cached } = await analyzeJobDescription({
    userId: req.user.id,
    jdText: req.body.jdText,
    applicationId: req.body.applicationId,
    useSavedProfile: req.body.useSavedProfile
  });

  res.status(cached ? 200 : 201).json({
    analysis: {
      id: analysis._id,
      applicationId: analysis.applicationId,
      type: analysis.type,
      result: analysis.result,
      model: analysis.model,
      createdAt: analysis.createdAt
    },
    cached
  });
});

export const resumeMatch = asyncHandler(async (req, res) => {
  const { analysis, cached } = await matchResumeToJobDescription({
    userId: req.user.id,
    resumeText: req.body.resumeText,
    jdText: req.body.jdText,
    applicationId: req.body.applicationId
  });

  res.status(cached ? 200 : 201).json({
    analysis: {
      id: analysis._id,
      applicationId: analysis.applicationId,
      type: analysis.type,
      result: analysis.result,
      model: analysis.model,
      createdAt: analysis.createdAt
    },
    cached
  });
});
