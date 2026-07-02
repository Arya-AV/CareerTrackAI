import { Application } from "../models/Application.js";
import { Note } from "../models/Note.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const findOwnedNote = async (id, userId) => {
  const note = await Note.findOne({ _id: id, userId });
  if (!note) throw new ApiError(404, "Note not found");
  return note;
};

const ensureApplication = async (applicationId, userId) => {
  if (!applicationId) return null;
  const application = await Application.findOne({ _id: applicationId, userId });
  if (!application) throw new ApiError(404, "Application not found");
  return application;
};

export const listNotes = asyncHandler(async (req, res) => {
  const { search, type, tag, limit } = req.query;
  const filter = { userId: req.user.id };

  if (type) filter.type = type;
  if (tag === "Mistake") {
    filter.$or = [{ tags: tag }, { type: "Mistake" }];
  } else if (tag) {
    filter.tags = tag;
  }
  if (search) filter.$text = { $search: search };

  const notes = await Note.find(filter).sort({ updatedAt: -1 }).limit(limit);
  res.json({ notes });
});

export const createNote = asyncHandler(async (req, res) => {
  const application = await ensureApplication(req.body.applicationId, req.user.id);
  const note = await Note.create({
    ...req.body,
    userId: req.user.id,
    company: req.body.company || application?.companyName || "",
    role: req.body.role || application?.role || "",
    sourceType: application ? "Application" : "Manual",
    sourceId: application?._id
  });

  res.status(201).json({ note });
});

export const updateNote = asyncHandler(async (req, res) => {
  const application = await ensureApplication(req.body.applicationId, req.user.id);
  const note = await findOwnedNote(req.params.id, req.user.id);

  Object.assign(note, {
    ...req.body,
    company: req.body.company ?? note.company,
    role: req.body.role ?? note.role
  });

  if (application) {
    note.company = req.body.company || application.companyName;
    note.role = req.body.role || application.role;
    note.sourceType = "Application";
    note.sourceId = application._id;
  }

  await note.save();
  res.json({ note });
});

export const deleteNote = asyncHandler(async (req, res) => {
  const note = await findOwnedNote(req.params.id, req.user.id);
  await note.deleteOne();
  res.status(204).send();
});

export const listTags = asyncHandler(async (req, res) => {
  const tags = await Note.distinct("tags", { userId: req.user.id });
  res.json({ tags: tags.sort((a, b) => a.localeCompare(b)) });
});
