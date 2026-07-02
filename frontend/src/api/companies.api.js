import { api } from "./client.js";

export const listCompanies = async () => {
  const { data } = await api.get("/api/companies");
  return data.companies;
};

export const getCompany = async (companyName) => {
  const { data } = await api.get(`/api/companies/${encodeURIComponent(companyName)}`);
  return data.company;
};
