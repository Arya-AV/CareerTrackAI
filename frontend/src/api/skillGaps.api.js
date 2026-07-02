import { api } from "./client.js";

export const listSkillGaps = async () => {
  const { data } = await api.get("/api/skill-gaps");
  return data.skillGaps;
};
