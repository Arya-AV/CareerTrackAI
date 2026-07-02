import { api } from "./client.js";

export const getLatestDigest = async () => {
  const { data } = await api.get("/api/digests/latest");
  return data.digest;
};

export const generateDigest = async () => {
  const { data } = await api.post("/api/digests/generate");
  return data;
};
