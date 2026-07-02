import mongoose from "mongoose";
import { Application } from "../models/Application.js";
import { Contact } from "../models/Contact.js";
import { Referral } from "../models/Referral.js";
import { generateContactOutreachDraft } from "../services/ai.service.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const findOwnedContact = async (id, userId) => {
  const contact = await Contact.findOne({ _id: id, userId });
  if (!contact) {
    throw new ApiError(404, "Contact not found");
  }

  return contact;
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const listContacts = asyncHandler(async (req, res) => {
  const { search, page, limit } = req.query;
  const userObjectId = new mongoose.Types.ObjectId(req.user.id);
  const match = { userId: userObjectId };

  if (search) {
    const searchRegex = new RegExp(escapeRegex(search), "i");
    match.$or = [
      { name: searchRegex },
      { company: searchRegex },
      { role: searchRegex },
      { notes: searchRegex }
    ];
  }

  const skip = (page - 1) * limit;
  const [items, totalResult] = await Promise.all([
    Contact.aggregate([
      { $match: match },
      { $sort: { company: 1, name: 1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: Referral.collection.name,
          let: { contactId: "$_id", ownerId: "$userId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $eq: ["$contactId", "$$contactId"] }, { $eq: ["$userId", "$$ownerId"] }]
                }
              }
            },
            { $count: "count" }
          ],
          as: "referralStats"
        }
      },
      {
        $addFields: {
          referralCount: { $ifNull: [{ $first: "$referralStats.count" }, 0] }
        }
      },
      { $project: { referralStats: 0 } }
    ]),
    Contact.countDocuments(match)
  ]);

  res.json({
    items,
    pagination: {
      page,
      limit,
      total: totalResult,
      pages: Math.ceil(totalResult / limit)
    }
  });
});

export const createContact = asyncHandler(async (req, res) => {
  const contact = await Contact.create({
    ...req.body,
    userId: req.user.id
  });

  res.status(201).json({ contact });
});

export const getContact = asyncHandler(async (req, res) => {
  const contact = await findOwnedContact(req.params.id, req.user.id);
  res.json({ contact });
});

export const updateContact = asyncHandler(async (req, res) => {
  const contact = await findOwnedContact(req.params.id, req.user.id);
  Object.assign(contact, req.body);
  await contact.save();

  res.json({ contact });
});

export const deleteContact = asyncHandler(async (req, res) => {
  const contact = await findOwnedContact(req.params.id, req.user.id);
  await contact.deleteOne();

  await Referral.updateMany({ userId: req.user.id, contactId: req.params.id }, { $unset: { contactId: "" } });

  res.status(204).send();
});

export const listContactApplications = asyncHandler(async (req, res) => {
  await findOwnedContact(req.params.id, req.user.id);

  const referrals = await Referral.find({ userId: req.user.id, contactId: req.params.id })
    .sort({ createdAt: -1 })
    .populate({
      path: "applicationId",
      model: Application,
      select: "companyName role status appliedDate deadline source jobLink"
    });

  res.json({
    items: referrals.map((referral) => ({
      referral,
      application: referral.applicationId || null
    }))
  });
});

export const generateOutreachDraft = asyncHandler(async (req, res) => {
  await findOwnedContact(req.params.id, req.user.id);

  const { draft, cached } = await generateContactOutreachDraft({
    userId: req.user.id,
    contactId: req.params.id,
    purpose: req.body.purpose,
    context: req.body.context
  });

  res.json({ draft, cached });
});
