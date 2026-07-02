import { api } from "./client.js";

export const listContacts = async (params = {}) => {
  const response = await api.get("/api/contacts", { params });
  return response.data;
};

export const createContact = async (payload) => {
  const response = await api.post("/api/contacts", payload);
  return response.data.contact;
};

export const getContact = async (id) => {
  const response = await api.get(`/api/contacts/${id}`);
  return response.data.contact;
};

export const updateContact = async ({ id, payload }) => {
  const response = await api.patch(`/api/contacts/${id}`, payload);
  return response.data.contact;
};

export const generateOutreachDraft = async ({ id, payload }) => {
  const response = await api.post(`/api/contacts/${id}/outreach-draft`, payload);
  return response.data;
};

export const deleteContact = async (id) => {
  await api.delete(`/api/contacts/${id}`);
};

export const listContactApplications = async (id) => {
  const response = await api.get(`/api/contacts/${id}/applications`);
  return response.data.items;
};
