import mongoose from "mongoose";
import { Application } from "../models/Application.js";
import { ResumeVersion } from "../models/ResumeVersion.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const findOwnedResumeVersion = async (id, userId) => {
  const resumeVersion = await ResumeVersion.findOne({ _id: id, userId });
  if (!resumeVersion) {
    throw new ApiError(404, "Resume version not found");
  }

  return resumeVersion;
};

const buildPerformancePipeline = ({ userId, resumeVersionId }) => [
  {
    $match: {
      userId,
      resumeVersionId
    }
  },
  {
    $group: {
      _id: null,
      applicationsSent: { $sum: 1 },
      responses: { $sum: { $cond: [{ $ne: ["$status", "Applied"] }, 1, 0] } },
      interviews: { $sum: { $cond: [{ $in: ["$status", ["Interview", "Offer"]] }, 1, 0] } },
      offers: { $sum: { $cond: [{ $eq: ["$status", "Offer"] }, 1, 0] } }
    }
  },
  {
    $project: {
      _id: 0,
      applicationsSent: 1,
      responseRate: {
        $cond: [
          { $eq: ["$applicationsSent", 0] },
          0,
          { $round: [{ $multiply: [{ $divide: ["$responses", "$applicationsSent"] }, 100] }, 1] }
        ]
      },
      interviewRate: {
        $cond: [
          { $eq: ["$applicationsSent", 0] },
          0,
          { $round: [{ $multiply: [{ $divide: ["$interviews", "$applicationsSent"] }, 100] }, 1] }
        ]
      },
      offerRate: {
        $cond: [
          { $eq: ["$applicationsSent", 0] },
          0,
          { $round: [{ $multiply: [{ $divide: ["$offers", "$applicationsSent"] }, 100] }, 1] }
        ]
      }
    }
  }
];

const emptyPerformance = {
  applicationsSent: 0,
  responseRate: 0,
  interviewRate: 0,
  offerRate: 0
};

export const listResumeVersions = asyncHandler(async (req, res) => {
  const userObjectId = new mongoose.Types.ObjectId(req.user.id);
  const filter = { userId: req.user.id };
  if (!req.query.includeArchived) {
    filter.archived = false;
  }

  const versions = await ResumeVersion.find(filter).sort({ createdAt: -1 });
  const performanceRows = await Application.aggregate([
    {
      $match: {
        userId: userObjectId,
        resumeVersionId: { $in: versions.map((version) => version._id) }
      }
    },
    {
      $group: {
        _id: "$resumeVersionId",
        applicationsSent: { $sum: 1 },
        responses: { $sum: { $cond: [{ $ne: ["$status", "Applied"] }, 1, 0] } },
        interviews: { $sum: { $cond: [{ $in: ["$status", ["Interview", "Offer"]] }, 1, 0] } },
        offers: { $sum: { $cond: [{ $eq: ["$status", "Offer"] }, 1, 0] } }
      }
    },
    {
      $project: {
        _id: 1,
        applicationsSent: 1,
        responseRate: {
          $cond: [
            { $eq: ["$applicationsSent", 0] },
            0,
            { $round: [{ $multiply: [{ $divide: ["$responses", "$applicationsSent"] }, 100] }, 1] }
          ]
        },
        interviewRate: {
          $cond: [
            { $eq: ["$applicationsSent", 0] },
            0,
            { $round: [{ $multiply: [{ $divide: ["$interviews", "$applicationsSent"] }, 100] }, 1] }
          ]
        },
        offerRate: {
          $cond: [
            { $eq: ["$applicationsSent", 0] },
            0,
            { $round: [{ $multiply: [{ $divide: ["$offers", "$applicationsSent"] }, 100] }, 1] }
          ]
        }
      }
    }
  ]);

  const performanceById = new Map(performanceRows.map((row) => [row._id.toString(), row]));
  res.json({
    resumeVersions: versions.map((version) => ({
      ...version.toObject(),
      performance: performanceById.get(version._id.toString()) || emptyPerformance
    }))
  });
});

export const createResumeVersion = asyncHandler(async (req, res) => {
  const resumeVersion = await ResumeVersion.create({
    ...req.body,
    userId: req.user.id
  });

  res.status(201).json({ resumeVersion });
});

export const getResumeVersion = asyncHandler(async (req, res) => {
  const resumeVersion = await findOwnedResumeVersion(req.params.id, req.user.id);
  res.json({ resumeVersion });
});

export const updateResumeVersion = asyncHandler(async (req, res) => {
  const resumeVersion = await findOwnedResumeVersion(req.params.id, req.user.id);
  Object.assign(resumeVersion, req.body);
  await resumeVersion.save();

  res.json({ resumeVersion });
});

export const deleteResumeVersion = asyncHandler(async (req, res) => {
  const resumeVersion = await findOwnedResumeVersion(req.params.id, req.user.id);
  await resumeVersion.deleteOne();

  await Application.updateMany(
    { userId: req.user.id, resumeVersionId: req.params.id },
    { $unset: { resumeVersionId: "" } }
  );

  res.status(204).send();
});

export const getResumeVersionPerformance = asyncHandler(async (req, res) => {
  const resumeVersion = await findOwnedResumeVersion(req.params.id, req.user.id);
  const [performance = emptyPerformance] = await Application.aggregate(
    buildPerformancePipeline({ userId: resumeVersion.userId, resumeVersionId: resumeVersion._id })
  );

  res.json({ performance });
});
