import { SkillGap } from "../models/SkillGap.js";
import { normalizeText } from "../utils/textHash.js";

const normalizeSkill = (skill) => skill.trim().replace(/\s+/g, " ");
const skillKey = (skill) => normalizeText(skill);

export const recordJdSkillGaps = async ({ userId, requiredSkills = [], missingSkills = [] }) => {
  const now = new Date();
  const missingKeys = new Set(missingSkills.map(skillKey));
  const uniqueSkills = new Map();

  requiredSkills.forEach((skill) => {
    const normalized = normalizeSkill(skill);
    if (normalized) uniqueSkills.set(skillKey(normalized), normalized);
  });

  if (!uniqueSkills.size) return;

  await Promise.all(
    Array.from(uniqueSkills.entries()).map(([key, skillName]) =>
      SkillGap.updateOne(
        { userId, skillName: key },
        {
          $setOnInsert: { userId, skillName: key },
          $inc: {
            timesRequested: 1,
            timesMatched: missingKeys.has(key) ? 0 : 1
          },
          $set: { lastSeenAt: now }
        },
        { upsert: true }
      )
    )
  );
};
