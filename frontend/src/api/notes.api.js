import { api } from "./client.js";

export const listNotes = async (params = {}) => {
  const { data } = await api.get("/api/notes", { params });
  return data.notes;
};

export const createNote = async (payload) => {
  const { data } = await api.post("/api/notes", payload);
  return data.note;
};

export const updateNote = async ({ id, payload }) => {
  const { data } = await api.patch(`/api/notes/${id}`, payload);
  return data.note;
};

export const deleteNote = async (id) => {
  await api.delete(`/api/notes/${id}`);
};

export const listNoteTags = async () => {
  const { data } = await api.get("/api/notes/tags");
  return data.tags;
};
