import { api } from "./client.js";

export const getDashboardSummary = async () => {
  const { data } = await api.get("/api/dashboard/summary");
  return data.summary;
};

export const getCompanyStatusBreakdown = async () => {
  const { data } = await api.get("/api/dashboard/company-status");
  return data.rows;
};

export const getMonthlyVolume = async () => {
  const { data } = await api.get("/api/dashboard/monthly-volume");
  return data.rows;
};

export const getMomentum = async () => {
  const { data } = await api.get("/api/dashboard/momentum");
  return data.momentum;
};

export const getRejectionPatterns = async () => {
  const { data } = await api.get("/api/dashboard/rejection-patterns");
  return data.rejectionPatterns;
};
