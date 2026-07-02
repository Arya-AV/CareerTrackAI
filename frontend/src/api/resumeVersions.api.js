import { api } from "./client.js";

export const listResumeVersions = async (params = {}) => {
  const { data } = await api.get("/api/resume-versions", { params });
  return data.resumeVersions;
};

export const createResumeVersion = async (payload) => {
  const { data } = await api.post("/api/resume-versions", payload);
  return data.resumeVersion;
};

export const updateResumeVersion = async ({ id, payload }) => {
  const { data } = await api.patch(`/api/resume-versions/${id}`, payload);
  return data.resumeVersion;
};

export const deleteResumeVersion = async (id) => {
  await api.delete(`/api/resume-versions/${id}`);
};

export const getResumeVersionPerformance = async (id) => {
  const { data } = await api.get(`/api/resume-versions/${id}/performance`);
  return data.performance;
};
