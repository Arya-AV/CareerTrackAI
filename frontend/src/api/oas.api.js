import { api } from "./client.js";

export const listApplicationOAs = async (applicationId) => {
  const { data } = await api.get(`/api/applications/${applicationId}/oas`);
  return data.oas;
};

export const createOARecord = async ({ applicationId, payload }) => {
  const { data } = await api.post(`/api/applications/${applicationId}/oas`, payload);
  return data.oa;
};

export const deleteOARecord = async (oaId) => {
  await api.delete(`/api/oas/${oaId}`);
};
