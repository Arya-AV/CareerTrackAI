import mongoose from "mongoose";
import { Application } from "../models/Application.js";
import { Contact } from "../models/Contact.js";
import { Note } from "../models/Note.js";
import { Referral } from "../models/Referral.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const asObjectId = (value) => new mongoose.Types.ObjectId(value);
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const companyRegex = (companyName) => new RegExp(`^${escapeRegex(companyName.trim())}$`, "i");

const statusRank = {
  Offer: 5,
  Interview: 4,
  OA: 3,
  Applied: 2,
  Rejected: 1
};

const pickCurrentStage = (statuses = []) =>
  statuses
    .map((status) => status.status)
    .sort((a, b) => (statusRank[b] || 0) - (statusRank[a] || 0))[0] || "Applied";

export const listCompanies = asyncHandler(async (req, res) => {
  const userId = asObjectId(req.user.id);
  const rows = await Application.aggregate([
    { $match: { userId } },
    {
      $group: {
        _id: "$companyName",
        applicationCount: { $sum: 1 },
        latestAppliedDate: { $max: "$appliedDate" },
        statuses: {
          $push: {
            status: "$status",
            appliedDate: "$appliedDate"
          }
        }
      }
    },
    { $sort: { latestAppliedDate: -1, _id: 1 } },
    {
      $project: {
        _id: 0,
        companyName: "$_id",
        applicationCount: 1,
        latestAppliedDate: 1,
        statuses: 1
      }
    }
  ]);

  res.json({
    companies: rows.map((row) => ({
      companyName: row.companyName,
      applicationCount: row.applicationCount,
      currentStage: pickCurrentStage(row.statuses),
      latestAppliedDate: row.latestAppliedDate
    }))
  });
});

export const getCompanyData = async ({ userId: userIdValue, companyName }) => {
  const userId = asObjectId(userIdValue);
  const name = companyName.trim();
  const exactCompany = companyRegex(name);
  const companyExperience = /^Company Experience$/i;

  const applications = await Application.find({ userId, companyName: exactCompany })
    .sort({ appliedDate: -1, createdAt: -1 })
    .select("companyName role location appliedDate deadline status source jobLink updatedAt rejectionStage rejectionFeedback");

  const applicationIds = applications.map((application) => application._id);

  const [outcomesBreakdown, responseStats, companyExperienceNotes, referrals] = await Promise.all([
    Application.aggregate([
      { $match: { userId, companyName: exactCompany } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $project: { _id: 0, status: "$_id", count: 1 } },
      { $sort: { status: 1 } }
    ]),
    Application.aggregate([
      {
        $match: {
          userId,
          companyName: exactCompany,
          status: { $ne: "Applied" }
        }
      },
      {
        $project: {
          responseTimeMs: { $subtract: ["$updatedAt", "$appliedDate"] }
        }
      },
      {
        $group: {
          _id: null,
          averageResponseTimeMs: { $avg: "$responseTimeMs" }
        }
      },
      {
        $project: {
          _id: 0,
          averageResponseTimeHours: {
            $cond: [
              { $eq: ["$averageResponseTimeMs", null] },
              null,
              { $round: [{ $divide: ["$averageResponseTimeMs", 1000 * 60 * 60] }, 1] }
            ]
          }
        }
      }
    ]),
    Note.find({
      userId,
      $and: [
        {
          $or: [
            { type: "Company Experience" },
            { tags: companyExperience }
          ]
        },
        {
          $or: [
            { company: exactCompany },
            { applicationId: { $in: applicationIds } }
          ]
        }
      ]
    })
      .sort({ updatedAt: -1 })
      .limit(50),
    Referral.find({
      userId,
      $or: [{ company: exactCompany }, { applicationId: { $in: applicationIds } }]
    })
      .sort({ createdAt: -1 })
      .populate("contactId")
  ]);

  const referralContactIds = referrals
    .map((referral) => referral.contactId?._id)
    .filter(Boolean);

  const contacts = await Contact.find({
    userId,
    $or: [
      { company: exactCompany },
      { _id: { $in: referralContactIds } }
    ]
  }).sort({ name: 1 });

  const contactMap = new Map(contacts.map((contact) => [contact._id.toString(), contact.toObject()]));
  referrals.forEach((referral) => {
    if (referral.contactId?._id) {
      contactMap.set(referral.contactId._id.toString(), referral.contactId.toObject());
    }
  });

  return {
    companyName: applications[0]?.companyName || name,
    applicationCount: applications.length,
    currentStage: pickCurrentStage(applications.map((application) => ({ status: application.status }))),
    averageResponseTimeHours: responseStats[0]?.averageResponseTimeHours ?? null,
    outcomesBreakdown,
    timeline: applications,
    companyExperienceNotes,
    contacts: Array.from(contactMap.values()),
    referrals
  };
};

export const getCompany = asyncHandler(async (req, res) => {
  const company = await getCompanyData({
    userId: req.user.id,
    companyName: req.params.companyName
  });

  res.json({ company });
});
