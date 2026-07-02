import { api, publicApi } from "./client.js";

export const signup = async (payload) => {
  const { data } = await api.post("/api/auth/signup", payload);
  return data;
};

export const login = async (payload) => {
  const { data } = await api.post("/api/auth/login", payload);
  return data;
};

export const logout = async () => {
  await api.post("/api/auth/logout");
};

export const forgotPassword = async (payload) => {
  const { data } = await publicApi.post("/api/auth/forgot-password", payload);
  return data;
};

export const resetPassword = async ({ token, newPassword }) => {
  const { data } = await publicApi.post(`/api/auth/reset-password/${token}`, { newPassword });
  return data;
};

export const refresh = async () => {
  const { data } = await api.post("/api/auth/refresh");
  return data;
};

export const getMe = async () => {
  const { data } = await api.get("/api/users/me");
  return data;
};
