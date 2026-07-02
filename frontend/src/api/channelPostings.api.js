import { api } from "./client.js";

export const listChannelPostings = async (params = {}) => {
  const { data } = await api.get("/api/channel-postings", { params });
  return data.postings;
};

export const createChannelPosting = async (payload) => {
  const { data } = await api.post("/api/channel-postings", payload);
  return data;
};

export const confirmChannelPosting = async (payload) => {
  const { data } = await api.post("/api/channel-postings/confirm", payload);
  return data.posting;
};

export const deleteChannelPosting = async (id) => {
  await api.delete(`/api/channel-postings/${id}`);
};

export const convertChannelPostingToToApply = async (id) => {
  const { data } = await api.post(`/api/channel-postings/${id}/convert-to-to-apply`);
  return data;
};
