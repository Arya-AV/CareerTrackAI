import { api } from "./client.js";

export const listReminders = async (params = {}) => {
  const { data } = await api.get("/api/reminders", { params });
  return data.reminders;
};

export const suggestReminders = async (payload) => {
  const { data } = await api.post("/api/reminders/suggest", payload);
  return data;
};

export const updateReminder = async ({ id, payload }) => {
  const { data } = await api.patch(`/api/reminders/${id}`, payload);
  return data.reminder;
};
