import { api } from "./client.js";

export const analyzeJd = async (payload) => {
  const { data } = await api.post("/api/ai/jd-analyze", payload);
  return data;
};

export const resumeMatch = async (payload) => {
  const { data } = await api.post("/api/ai/resume-match", payload);
  return data;
};
