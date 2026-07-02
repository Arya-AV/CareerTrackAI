import { api } from "./client.js";

export const listToApply = async (params = {}) => {
  const { data } = await api.get("/api/to-apply", { params });
  return data.entries;
};

export const createToApply = async (payload) => {
  const { data } = await api.post("/api/to-apply", payload);
  return data.entry;
};

export const updateToApply = async ({ id, payload }) => {
  const { data } = await api.patch(`/api/to-apply/${id}`, payload);
  return data.entry;
};

export const deleteToApply = async (id) => {
  await api.delete(`/api/to-apply/${id}`);
};

export const convertToApplication = async (id) => {
  const { data } = await api.post(`/api/to-apply/${id}/convert-to-application`);
  return data;
};
