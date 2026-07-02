import { api } from "./client.js";

export const listApplicationInterviews = async (applicationId) => {
  const { data } = await api.get(`/api/applications/${applicationId}/interviews`);
  return data.interviews;
};

export const createInterviewRound = async ({ applicationId, payload }) => {
  const { data } = await api.post(`/api/applications/${applicationId}/interviews`, payload);
  return data.interview;
};

export const submitInterviewReplay = async ({ interviewRoundId, text }) => {
  const { data } = await api.post(`/api/interviews/${interviewRoundId}/replay`, { text });
  return data;
};

export const confirmInterviewReplay = async ({ interviewRoundId, items }) => {
  const { data } = await api.post(`/api/interviews/${interviewRoundId}/replay/confirm`, { items });
  return data;
};
