import { z } from "zod";
import { Application } from "../models/Application.js";
import { WeeklyDigest } from "../models/WeeklyDigest.js";
import { env } from "../config/env.js";
import { getMomentumData, getRejectionPatternData } from "../controllers/dashboard.controller.js";
import { getSkillGapData } from "../controllers/skillGap.controller.js";
import { ApiError } from "../utils/ApiError.js";

const digestSchema = z.object({
  summaryText: z.string().trim().min(1).max(4000),
  suggestions: z.array(z.string().trim().min(1).max(300)).min(3).max(5)
});

const startOfWeek = (date = new Date()) => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return copy;
};

const startOfToday = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

const extractJson = (value) => {
  const trimmed = value.trim();
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  return first >= 0 && last > first ? trimmed.slice(first, last + 1) : trimmed;
};

const fallbackDigest = ({ momentum, rejectionPatterns, skillGaps }) => {
  const topGap = skillGaps[0];
  const pattern = rejectionPatterns.pattern;
  const summaryParts = [
    `Your current momentum score is ${momentum.current.momentumScore}, with ${momentum.current.applicationsSent} applications sent in the last 7 days.`,
    pattern
      ? `The clearest rejection pattern is ${pattern.stage.replaceAll("_", " ")} at ${pattern.share}% of rejections.`
      : "No dominant rejection pattern is strong enough to flag yet.",
    topGap
      ? `Your most repeated skill gap is ${topGap.skillName}.`
      : "Skill gaps will become clearer after more JD analyses."
  ];

  return {
    summaryText: summaryParts.join(" "),
    suggestions: [
      momentum.nudge || "Send two thoughtful follow-ups for applications that have been quiet for a week.",
      topGap ? `Create a focused revision note for ${topGap.skillName}.` : "Analyze two more job descriptions to sharpen your skill-gap view.",
      pattern ? "Review Mistake notes before the next similar round." : "Add one Company Experience note after each interview or OA."
    ]
  };
};

const callGeminiForDigest = async ({ momentum, rejectionPatterns, skillGaps }) => {
  if (!env.geminiApiKey) {
    return fallbackDigest({ momentum, rejectionPatterns, skillGaps });
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${env.geminiModel}:generateContent?key=${env.geminiApiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text:
                "You are CareerTrack AI's weekly career coach. Return only JSON with summaryText and suggestions. Use only the provided metrics. Keep summaryText readable and specific. Return 3-5 concise, actionable suggestions."
            }
          ]
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: JSON.stringify({
                  momentum,
                  rejectionPatterns,
                  topSkillGaps: skillGaps.slice(0, 10)
                })
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: "application/json"
        }
      })
    }
  );

  if (!response.ok) {
    throw new ApiError(502, "Gemini digest request failed", (await response.text()).slice(0, 500));
  }

  const payload = await response.json();
  const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text).join("") || "{}";
  return digestSchema.parse(JSON.parse(extractJson(text)));
};

export const getLatestDigest = (userId) => WeeklyDigest.findOne({ userId }).sort({ generatedAt: -1 });

export const generateWeeklyDigest = async ({ userId, force = false, now = new Date() }) => {
  const weekOf = startOfWeek(now);

  if (!force) {
    const existing = await WeeklyDigest.findOne({ userId, weekOf }).sort({ generatedAt: -1 });
    if (existing) return { digest: existing, cached: true };
  }

  const [momentum, rejectionPatterns, skillGaps] = await Promise.all([
    getMomentumData(userId),
    getRejectionPatternData(userId),
    getSkillGapData(userId, 10)
  ]);

  let result;
  try {
    result = await callGeminiForDigest({ momentum, rejectionPatterns, skillGaps });
  } catch (_error) {
    result = fallbackDigest({ momentum, rejectionPatterns, skillGaps });
  }

  const digest = await WeeklyDigest.create({
    userId,
    weekOf,
    summaryText: result.summaryText,
    suggestions: result.suggestions,
    generatedAt: now
  });

  return { digest, cached: false };
};

export const generateDigestNow = async (userId) => {
  const existingToday = await WeeklyDigest.findOne({
    userId,
    generatedAt: { $gte: startOfToday() }
  });

  if (existingToday) {
    throw new ApiError(429, "Weekly coach can only be generated once per day.");
  }

  return generateWeeklyDigest({ userId, force: true });
};

export const getUsersDueForWeeklyDigest = async ({ now = new Date(), limit = 25 } = {}) => {
  const weekOf = startOfWeek(now);
  const recentSince = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const activeUserIds = await Application.distinct("userId", {
    $or: [{ appliedDate: { $gte: recentSince } }, { updatedAt: { $gte: recentSince } }]
  });

  const existing = await WeeklyDigest.find({ weekOf, userId: { $in: activeUserIds } }).select("userId");
  const existingIds = new Set(existing.map((digest) => digest.userId.toString()));

  return activeUserIds.filter((userId) => !existingIds.has(userId.toString())).slice(0, limit);
};
