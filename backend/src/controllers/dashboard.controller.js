import mongoose from "mongoose";
import { Application } from "../models/Application.js";
import { Reminder } from "../models/Reminder.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const asObjectId = (value) => new mongoose.Types.ObjectId(value);

export const getDashboardSummary = asyncHandler(async (req, res) => {
  const userId = asObjectId(req.user.id);

  const [summary = {}] = await Application.aggregate([
    { $match: { userId } },
    {
      $group: {
        _id: null,
        totalApplications: { $sum: 1 },
        oaShortlistedCount: { $sum: { $cond: [{ $eq: ["$status", "OA"] }, 1, 0] } },
        interviewCount: { $sum: { $cond: [{ $eq: ["$status", "Interview"] }, 1, 0] } },
        rejectionCount: { $sum: { $cond: [{ $eq: ["$status", "Rejected"] }, 1, 0] } },
        offerCount: { $sum: { $cond: [{ $eq: ["$status", "Offer"] }, 1, 0] } }
      }
    },
    {
      $project: {
        _id: 0,
        totalApplications: 1,
        oaShortlistedCount: 1,
        interviewCount: 1,
        rejectionCount: 1,
        offerCount: 1,
        successRate: {
          $cond: [
            { $eq: ["$totalApplications", 0] },
            0,
            { $round: [{ $multiply: [{ $divide: ["$offerCount", "$totalApplications"] }, 100] }, 1] }
          ]
        }
      }
    }
  ]);

  res.json({
    summary: {
      totalApplications: summary.totalApplications || 0,
      oaShortlistedCount: summary.oaShortlistedCount || 0,
      interviewCount: summary.interviewCount || 0,
      rejectionCount: summary.rejectionCount || 0,
      offerCount: summary.offerCount || 0,
      successRate: summary.successRate || 0,
      successRateFormula: "offers / total applications * 100"
    }
  });
});

export const getCompanyStatusBreakdown = asyncHandler(async (req, res) => {
  const userId = asObjectId(req.user.id);

  const rows = await Application.aggregate([
    { $match: { userId } },
    {
      $group: {
        _id: { companyName: "$companyName", status: "$status" },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: "$_id.companyName",
        statuses: {
          $push: {
            status: "$_id.status",
            count: "$count"
          }
        },
        total: { $sum: "$count" }
      }
    },
    { $sort: { total: -1, _id: 1 } },
    {
      $project: {
        _id: 0,
        companyName: "$_id",
        total: 1,
        statuses: 1
      }
    }
  ]);

  res.json({ rows });
});

export const getMonthlyVolume = asyncHandler(async (req, res) => {
  const userId = asObjectId(req.user.id);

  const rows = await Application.aggregate([
    { $match: { userId } },
    {
      $group: {
        _id: {
          year: { $year: "$appliedDate" },
          month: { $month: "$appliedDate" }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
    {
      $project: {
        _id: 0,
        year: "$_id.year",
        month: "$_id.month",
        label: {
          $concat: [
            { $toString: "$_id.year" },
            "-",
            {
              $cond: [
                { $lt: ["$_id.month", 10] },
                { $concat: ["0", { $toString: "$_id.month" }] },
                { $toString: "$_id.month" }
              ]
            }
          ]
        },
        count: 1
      }
    }
  ]);

  res.json({ rows });
});

const calculateMomentumScore = ({ applicationsSent, responseRate, averageTimeToFirstResponseHours }) => {
  const volumeScore = Math.min(applicationsSent / 7, 1) * 35;
  const responseScore = Math.min(responseRate, 100) * 0.5;
  const speedScore =
    averageTimeToFirstResponseHours === null
      ? 0
      : Math.max(0, 15 - Math.min(averageTimeToFirstResponseHours / 24, 15));

  return Math.round(volumeScore + responseScore + speedScore);
};

const aggregateMomentumWindow = async ({ userId, start, end }) => {
  const [applicationStats = {}] = await Application.aggregate([
    {
      $match: {
        userId,
        appliedDate: { $gte: start, $lt: end }
      }
    },
    {
      $project: {
        status: 1,
        appliedDate: 1,
        updatedAt: 1,
        responded: { $ne: ["$status", "Applied"] },
        responseTimeMs: {
          $cond: [
            { $ne: ["$status", "Applied"] },
            { $subtract: ["$updatedAt", "$appliedDate"] },
            null
          ]
        }
      }
    },
    {
      $group: {
        _id: null,
        applicationsSent: { $sum: 1 },
        responsesReceived: { $sum: { $cond: ["$responded", 1, 0] } },
        averageResponseTimeMs: { $avg: "$responseTimeMs" }
      }
    },
    {
      $project: {
        _id: 0,
        applicationsSent: 1,
        responsesReceived: 1,
        responseRate: {
          $cond: [
            { $eq: ["$applicationsSent", 0] },
            0,
            { $round: [{ $multiply: [{ $divide: ["$responsesReceived", "$applicationsSent"] }, 100] }, 1] }
          ]
        },
        averageTimeToFirstResponseHours: {
          $cond: [
            { $eq: ["$averageResponseTimeMs", null] },
            null,
            { $round: [{ $divide: ["$averageResponseTimeMs", 1000 * 60 * 60] }, 1] }
          ]
        }
      }
    }
  ]);

  const [followUpStats = {}] = await Reminder.aggregate([
    {
      $match: {
        userId,
        type: "REFERRAL_FOLLOW_UP",
        status: "Sent",
        sentAt: { $gte: start, $lt: end }
      }
    },
    {
      $group: {
        _id: null,
        completedFollowUpReminders: { $sum: 1 }
      }
    },
    { $project: { _id: 0, completedFollowUpReminders: 1 } }
  ]);

  const result = {
    applicationsSent: applicationStats.applicationsSent || 0,
    responsesReceived: applicationStats.responsesReceived || 0,
    responseRate: applicationStats.responseRate || 0,
    averageTimeToFirstResponseHours:
      applicationStats.averageTimeToFirstResponseHours === undefined
        ? null
        : applicationStats.averageTimeToFirstResponseHours,
    completedFollowUpReminders: followUpStats.completedFollowUpReminders || 0
  };

  return {
    ...result,
    momentumScore: calculateMomentumScore(result)
  };
};

export const getMomentumData = async (userIdValue) => {
  const userId = asObjectId(userIdValue);
  const now = new Date();
  const currentStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const previousStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [current, previous] = await Promise.all([
    aggregateMomentumWindow({ userId, start: currentStart, end: now }),
    aggregateMomentumWindow({ userId, start: previousStart, end: currentStart })
  ]);

  const delta = current.momentumScore - previous.momentumScore;
  const trend = delta > 0 ? "up" : delta < 0 ? "down" : "flat";
  const nudge =
    current.applicationsSent > 5 && current.completedFollowUpReminders === 0
      ? "You sent more than 5 applications this week but have no completed follow-ups. Pick 2-3 promising roles and send a quick follow-up today."
      : null;

  return {
    windowDays: 7,
    scoreFormula:
      "volume component + response-rate component + response-speed component, capped to a 0-100 style score",
    current,
    previous,
    trend,
    delta,
    nudge
  };
};

export const getMomentum = asyncHandler(async (req, res) => {
  const momentum = await getMomentumData(req.user.id);
  res.json({ momentum });
});

export const getRejectionPatternData = async (userIdValue) => {
  const userId = asObjectId(userIdValue);

  const rows = await Application.aggregate([
    { $match: { userId, status: "Rejected" } },
    {
      $group: {
        _id: { $ifNull: ["$rejectionStage", "other"] },
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1, _id: 1 } },
    {
      $project: {
        _id: 0,
        stage: "$_id",
        count: 1
      }
    }
  ]);

  const totalRejections = rows.reduce((sum, row) => sum + row.count, 0);
  const topStage = rows[0] || null;
  const share = totalRejections && topStage ? Math.round((topStage.count / totalRejections) * 1000) / 10 : 0;
  const pattern =
    topStage && share > 50
      ? {
          stage: topStage.stage,
          count: topStage.count,
          share,
          message: `${share}% of your rejections are happening at the ${topStage.stage.replaceAll("_", " ")} stage. Review your Mistake notes for recurring gaps before the next round.`
        }
      : null;

  return {
    totalRejections,
    rows,
    pattern
  };
};

export const getRejectionPatterns = asyncHandler(async (req, res) => {
  const rejectionPatterns = await getRejectionPatternData(req.user.id);
  res.json({ rejectionPatterns });
});
