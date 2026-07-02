import { api } from "./client.js";

export const listApplications = async (params = {}) => {
  const { data } = await api.get("/api/applications", { params });
  return data;
};

export const createApplication = async (payload) => {
  const { data } = await api.post("/api/applications", payload);
  return data.application;
};

export const getApplication = async (id) => {
  const { data } = await api.get(`/api/applications/${id}`);
  return data.application;
};

export const listApplicationAiAnalyses = async (applicationId) => {
  const { data } = await api.get(`/api/applications/${applicationId}/ai-analyses`);
  return data.analyses;
};

export const listApplicationNotes = async (applicationId) => {
  const { data } = await api.get(`/api/applications/${applicationId}/notes`);
  return data.notes;
};

export const updateApplication = async ({ id, payload }) => {
  const { data } = await api.patch(`/api/applications/${id}`, payload);
  return data.application;
};

export const updateApplicationStatus = async ({ id, status, rejectionStage, rejectionFeedback }) => {
  const { data } = await api.patch(`/api/applications/${id}/status`, {
    status,
    rejectionStage,
    rejectionFeedback
  });
  return data.application;
};

export const deleteApplication = async (id) => {
  await api.delete(`/api/applications/${id}`);
};
