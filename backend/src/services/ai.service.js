import { AIAnalysis } from "../models/AIAnalysis.js";
import { Application } from "../models/Application.js";
import { Contact } from "../models/Contact.js";
import { User } from "../models/User.js";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";
import { normalizeText, sha256 } from "../utils/textHash.js";
import { recordJdSkillGaps } from "./skillGap.service.js";
import {
  channelPostingExtractionSchema,
  contactOutreachDraftSchema,
  interviewReplayItemSchema,
  jdAnalysisResultSchema,
  resumeMatchResultSchema
} from "../validators/ai.schema.js";

const PROMPT_VERSION = "jd-analyzer-v1-warning";
const MAX_AI_CALLS_PER_HOUR = 10;

export const JD_ANALYZER_SYSTEM_PROMPT = `You are CareerTrack AI's job-description analysis engine.

Your job is to analyze a pasted job description against an optional candidate resume/profile.

Return only valid JSON. Do not include markdown, comments, explanations, or prose outside JSON.

The JSON must exactly match this schema:
{
  "required_skills": string[],
  "missing_skills": string[],
  "resume_keyword_suggestions": string[],
  "prep_checklist": string[],
  "dsa_topics_to_revise": string[],
  "warning": string | null
}

Rules:
- required_skills: Extract concrete skills, tools, technologies, frameworks, concepts, qualifications, and role-specific competencies from the job description.
- missing_skills: Compare required_skills against the candidate resume/profile when provided. Include skills required by the JD that are not clearly present in the candidate context.
- If no candidate resume/profile is provided, set missing_skills equal to required_skills because comparison is not possible.
- resume_keyword_suggestions: Suggest ATS-friendly keywords or phrases the candidate should consider adding only if truthful and relevant to their actual background.
- prep_checklist: Return prioritized, actionable preparation items. Put the highest-impact items first.
- dsa_topics_to_revise: Populate only if the JD or role appears technical/software/engineering/data/ML-related and DSA revision is relevant. Otherwise return [].
- warning: If the input does not look like a real job description, is unrelated text, gibberish, or too short to analyze, set warning to a short clear explanation and return empty arrays. If the input is a valid job description, set warning to null.
- Do not invent candidate experience.
- Do not include duplicate items.
- Keep each array item concise and UI-friendly.
- Prefer specific skills over vague categories.
- If the job description is too vague, infer cautiously and keep the output conservative.
- If the input is unrelated to a job description, return empty arrays for all fields and explain the issue in warning.

Candidate comparison policy:
- Treat a skill as present only if it appears explicitly in the candidate resume/profile or is an obvious direct synonym.
- Do not assume adjacent skills. For example, React does not imply Angular, SQL does not imply MongoDB, Python does not imply Java.
- If the candidate has no resume/profile context, do not pretend a comparison was performed.

Output JSON only.`;

export const RESUME_MATCH_SYSTEM_PROMPT = `You are CareerTrack AI's resume-to-job-description matching engine.

Your job is to compare a candidate resume against a job description and return a structured, recruiter-style match analysis.

Return only valid JSON. Do not include markdown, comments, explanations, or prose outside JSON.

The JSON must exactly match this schema:
{
  "match_percentage": number,
  "matched_keywords": string[],
  "missing_keywords": string[],
  "bullet_suggestions": [
    {
      "original": string,
      "improved": string,
      "reason": string
    }
  ],
  "score_justification": string,
  "warning": string | null
}

Rules:
- match_percentage must be a number from 0 to 100.
- matched_keywords: keywords, skills, tools, technologies, responsibilities, and qualifications from the JD that are clearly present in the resume.
- missing_keywords: important JD keywords, skills, tools, technologies, responsibilities, or qualifications that are not clearly present in the resume.
- bullet_suggestions: suggest improvements only for the resume bullets most worth revising. Do not rewrite every bullet.
- Each bullet suggestion must preserve the candidate's truthful experience. Do not invent employers, metrics, projects, tools, or achievements.
- If a bullet lacks measurable impact, improve clarity and action/result language without fabricating numbers.
- score_justification: briefly explain why the match_percentage was chosen, referencing the strongest matches and most important gaps.
- warning: if either input does not look valid, set warning to a short clear explanation and return match_percentage as 0 with empty arrays. If both inputs are valid, set warning to null.
- Keep array items concise and UI-friendly.
- Do not include duplicate keywords.
- Prefer specific keywords over vague categories.
- Treat a skill as matched only if it appears explicitly in the resume or as an obvious direct synonym.
- Do not assume adjacent skills. For example, React does not imply Angular, SQL does not imply MongoDB, Python does not imply Java.
- If the resume is too short or generic to compare meaningfully, set warning explaining that the resume text is insufficient.
- If the job description is too short or does not look like a real JD, set warning explaining that the JD text is insufficient.

Scoring guidance:
- 85-100: strong match; most core requirements are present and resume evidence is specific.
- 70-84: good match; many requirements are present with a few notable gaps.
- 50-69: partial match; some relevant skills are present but important requirements are missing.
- 25-49: weak match; limited overlap with the JD.
- 0-24: poor match or invalid/insufficient input.

Output JSON only.`;

export const INTERVIEW_REPLAY_SYSTEM_PROMPT = `You are CareerTrack AI's interview replay extraction engine.

Your job is to turn a candidate's plain-text interview recall into structured notes.

Return only valid JSON. Do not include markdown, comments, explanations, or prose outside JSON.

The JSON must exactly match this schema:
[
  {
    "question": string,
    "answerSummary": string,
    "suggestedTag": "Mistake" | "Revision Note"
  }
]

Rules:
- Extract concrete interview questions or discussion prompts from the replay.
- answerSummary should summarize what the candidate answered, missed, or should remember.
- suggestedTag must be "Mistake" when the note describes an error, weak answer, missed concept, or improvement area.
- suggestedTag must be "Revision Note" when the note is mainly a concept/topic/question worth reviewing.
- If the replay is vague, infer conservatively and create only useful notes.
- Do not invent companies, interviewers, outcomes, or questions not grounded in the replay.
- Keep each item concise and useful for later revision.
- Return [] if the text is unrelated to an interview or too empty to extract useful notes.

Output JSON only.`;

export const CHANNEL_POSTING_SYSTEM_PROMPT = `You are CareerTrack AI's channel-posting extraction engine.

Your job is to read a pasted hiring post from Telegram, WhatsApp, Discord, email, or a jobs channel and extract only the core posting fields.

Return only valid JSON. Do not include markdown, comments, explanations, or prose outside JSON.

The JSON must exactly match this schema:
{
  "companyName": string,
  "roleTitle": string,
  "jobLink": string,
  "warning": string | null
}

Rules:
- companyName: Extract the hiring company if present. If unclear, return "".
- roleTitle: Extract the role/title/opening name if present. If unclear, return "".
- jobLink: Extract the most relevant application/job URL if present. If no URL exists, return "".
- warning: If the text does not look like a hiring/job posting, set a short explanation. Otherwise set null.
- Do not invent company names, roles, or links.
- If multiple links exist, choose the most likely application/job posting link.
- Keep values concise and UI-friendly.

Output JSON only.`;

export const CONTACT_OUTREACH_SYSTEM_PROMPT = `You are CareerTrack AI's professional networking email draft assistant.

Your job is to draft a concise, warm, professional outreach message the user can copy into their own email client.

Return only valid JSON. Do not include markdown, comments, explanations, or prose outside JSON.

The JSON must exactly match this schema:
{
  "draft": string
}

Rules:
- Write the draft as an email message, including a short subject line and body.
- Keep the tone respectful, specific, and not pushy.
- Use the contact's name, company, role, contact type, and notes when provided.
- If the purpose is referral-related, ask politely and make it easy for the contact to decline.
- Do not claim the user has attached files or sent anything.
- Do not invent shared history, credentials, job IDs, or application facts not provided.
- Keep the full draft under 220 words.
- Do not include placeholders like [your name] unless unavoidable; write as the user can edit it.

Output JSON only.`;

const buildCandidateContext = (user) => {
  const profile = user.profile || {};
  const parts = [];

  if (profile.resumeText) {
    parts.push(`Resume text:\n${profile.resumeText}`);
  }

  if (profile.skills?.length) {
    parts.push(`Skills:\n${profile.skills.join(", ")}`);
  }

  if (profile.targetRoles?.length) {
    parts.push(`Target roles:\n${profile.targetRoles.join(", ")}`);
  }

  if (profile.education) {
    parts.push(`Education:\n${profile.education}`);
  }

  if (profile.experienceLevel) {
    parts.push(`Experience level:\n${profile.experienceLevel}`);
  }

  return parts.join("\n\n");
};

const extractJson = (value) => {
  const trimmed = value.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return trimmed;
  }

  const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (match) {
    return match[1].trim();
  }

  const firstObject = trimmed.indexOf("{");
  const firstArray = trimmed.indexOf("[");
  const first =
    firstObject === -1 ? firstArray : firstArray === -1 ? firstObject : Math.min(firstObject, firstArray);
  const last = Math.max(trimmed.lastIndexOf("}"), trimmed.lastIndexOf("]"));
  if (first !== -1 && last !== -1 && last > first) {
    return trimmed.slice(first, last + 1);
  }

  return trimmed;
};

const callGemini = async ({ systemPrompt, userPrompt }) => {
  if (!env.geminiApiKey) {
    throw new ApiError(503, "Gemini API key is not configured");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${env.geminiModel}:generateContent?key=${env.geminiApiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        contents: [
          {
            role: "user",
            parts: [{ text: userPrompt }]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json"
        }
      })
    }
  );

  if (!response.ok) {
    const message = await response.text();
    throw new ApiError(502, "Gemini request failed", message.slice(0, 500));
  }

  const payload = await response.json();
  const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text).join("") || "";
  return {
    text,
    usageMetadata: payload.usageMetadata
  };
};

const parseAndValidate = (text) => {
  const parsed = JSON.parse(extractJson(text));
  return jdAnalysisResultSchema.parse(parsed);
};

const parseAndValidateResumeMatch = (text) => {
  const parsed = JSON.parse(extractJson(text));
  return resumeMatchResultSchema.parse(parsed);
};

const parseAndValidateInterviewReplay = (text) => {
  const parsed = JSON.parse(extractJson(text));
  return interviewReplayItemSchema.array().parse(parsed);
};

const parseAndValidateChannelPosting = (text) => {
  const parsed = JSON.parse(extractJson(text));
  return channelPostingExtractionSchema.parse(parsed);
};

const parseAndValidateContactOutreach = (text) => {
  const parsed = JSON.parse(extractJson(text));
  return contactOutreachDraftSchema.parse(parsed);
};

const enforceRateLimit = async (userId, type = "JD_ANALYSIS") => {
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const calls = await AIAnalysis.countDocuments({
    userId,
    type,
    createdAt: { $gte: since },
    cachedFromAnalysisId: { $exists: false }
  });

  if (calls >= MAX_AI_CALLS_PER_HOUR) {
    throw new ApiError(429, "AI analysis limit reached. Please try again later.");
  }
};

export const analyzeJobDescription = async ({ userId, jdText, applicationId, useSavedProfile = true }) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  let application;
  if (applicationId) {
    application = await Application.findOne({ _id: applicationId, userId });
    if (!application) {
      throw new ApiError(404, "Application not found");
    }
  }

  const candidateContext = useSavedProfile ? buildCandidateContext(user) : "";
  const jdTextHash = sha256(normalizeText(jdText));
  const resumeContextHash = sha256(normalizeText(candidateContext));
  const inputHash = sha256(`${PROMPT_VERSION}:${jdTextHash}:${resumeContextHash}`);

  const cached = await AIAnalysis.findOne({ userId, type: "JD_ANALYSIS", inputHash });
  if (cached) {
    if (applicationId && !cached.applicationId) {
      cached.applicationId = applicationId;
      await cached.save();
    }

    return { analysis: cached, cached: true };
  }

  await enforceRateLimit(userId, "JD_ANALYSIS");

  const buildJdPrompt = (repairInstruction) => `${repairInstruction ? `${repairInstruction}\n\n` : ""}Analyze this job description.

Candidate resume/profile context:
${candidateContext || "(none provided)"}

Job description:
${jdText}`;

  let geminiResponse = await callGemini({
    systemPrompt: JD_ANALYZER_SYSTEM_PROMPT,
    userPrompt: buildJdPrompt()
  });
  let result;

  try {
    result = parseAndValidate(geminiResponse.text);
  } catch (_error) {
    geminiResponse = await callGemini({
      systemPrompt: JD_ANALYZER_SYSTEM_PROMPT,
      userPrompt: buildJdPrompt(
        "Your previous response was malformed. Return only valid JSON matching the exact schema with warning included."
      )
    });

    try {
      result = parseAndValidate(geminiResponse.text);
    } catch (error) {
      throw new ApiError(502, "AI response was not valid JSON after retry", error.message);
    }
  }

  const analysis = await AIAnalysis.create({
    userId,
    applicationId,
    type: "JD_ANALYSIS",
    inputHash,
    jdTextHash,
    resumeContextHash,
    result,
    model: env.geminiModel,
    tokenUsage: geminiResponse.usageMetadata
  });

  await recordJdSkillGaps({
    userId,
    requiredSkills: result.required_skills,
    missingSkills: result.missing_skills
  });

  return { analysis, cached: false };
};

export const matchResumeToJobDescription = async ({ userId, resumeText, jdText, applicationId }) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  let application;
  if (applicationId) {
    application = await Application.findOne({ _id: applicationId, userId });
    if (!application) {
      throw new ApiError(404, "Application not found");
    }
  }

  const resumeTextHash = sha256(normalizeText(resumeText));
  const jdTextHash = sha256(normalizeText(jdText));
  const inputHash = sha256(`resume-match-v1:${resumeTextHash}:${jdTextHash}`);

  const cached = await AIAnalysis.findOne({ userId, type: "RESUME_MATCH", inputHash });
  if (cached) {
    if (applicationId && !cached.applicationId) {
      cached.applicationId = applicationId;
      await cached.save();
    }

    return { analysis: cached, cached: true };
  }

  await enforceRateLimit(userId, "RESUME_MATCH");

  const buildResumePrompt = (repairInstruction) => `${repairInstruction ? `${repairInstruction}\n\n` : ""}Compare this resume against this job description.

Resume:
${resumeText}

Job description:
${jdText}`;

  let geminiResponse = await callGemini({
    systemPrompt: RESUME_MATCH_SYSTEM_PROMPT,
    userPrompt: buildResumePrompt()
  });
  let result;

  try {
    result = parseAndValidateResumeMatch(geminiResponse.text);
  } catch (_error) {
    geminiResponse = await callGemini({
      systemPrompt: RESUME_MATCH_SYSTEM_PROMPT,
      userPrompt: buildResumePrompt(
        "Your previous response was malformed. Return only valid JSON matching the exact schema with score_justification and warning included."
      )
    });

    try {
      result = parseAndValidateResumeMatch(geminiResponse.text);
    } catch (error) {
      throw new ApiError(502, "AI response was not valid JSON after retry", error.message);
    }
  }

  const analysis = await AIAnalysis.create({
    userId,
    applicationId,
    type: "RESUME_MATCH",
    inputHash,
    jdTextHash,
    resumeContextHash: resumeTextHash,
    result,
    model: env.geminiModel,
    tokenUsage: geminiResponse.usageMetadata
  });

  return { analysis, cached: false };
};

export const extractInterviewReplayNotes = async ({ userId, interviewRoundId, text }) => {
  const textHash = sha256(normalizeText(text));
  const inputHash = sha256(`interview-replay-v1:${interviewRoundId}:${textHash}`);

  const cached = await AIAnalysis.findOne({ userId, type: "INTERVIEW_REPLAY", inputHash });
  if (cached) {
    return {
      items: cached.result?.interview_replay_items || [],
      cached: true,
      analysis: cached
    };
  }

  await enforceRateLimit(userId, "INTERVIEW_REPLAY");

  const buildReplayPrompt = (repairInstruction) => `${repairInstruction ? `${repairInstruction}\n\n` : ""}Extract structured interview notes from this replay.

Interview round id:
${interviewRoundId}

Replay text:
${text}`;

  let geminiResponse = await callGemini({
    systemPrompt: INTERVIEW_REPLAY_SYSTEM_PROMPT,
    userPrompt: buildReplayPrompt()
  });
  let items;

  try {
    items = parseAndValidateInterviewReplay(geminiResponse.text);
  } catch (_error) {
    geminiResponse = await callGemini({
      systemPrompt: INTERVIEW_REPLAY_SYSTEM_PROMPT,
      userPrompt: buildReplayPrompt(
        "Your previous response was malformed. Return only valid JSON matching the exact array schema."
      )
    });

    try {
      items = parseAndValidateInterviewReplay(geminiResponse.text);
    } catch (error) {
      throw new ApiError(502, "AI response was not valid JSON after retry", error.message);
    }
  }

  const analysis = await AIAnalysis.create({
    userId,
    type: "INTERVIEW_REPLAY",
    inputHash,
    jdTextHash: textHash,
    resumeContextHash: interviewRoundId,
    result: { interview_replay_items: items },
    model: env.geminiModel,
    tokenUsage: geminiResponse.usageMetadata
  });

  return { items, cached: false, analysis };
};

export const extractChannelPosting = async ({ userId, rawText }) => {
  const rawTextHash = sha256(normalizeText(rawText));
  const inputHash = sha256(`channel-posting-v1:${rawTextHash}`);

  const cached = await AIAnalysis.findOne({ userId, type: "CHANNEL_POSTING", inputHash });
  if (cached) {
    return { extraction: cached.result, cached: true, analysis: cached };
  }

  await enforceRateLimit(userId, "CHANNEL_POSTING");

  const buildPrompt = (repairInstruction) => `${repairInstruction ? `${repairInstruction}\n\n` : ""}Extract the posting fields from this channel message.

Raw message:
${rawText}`;

  let geminiResponse = await callGemini({
    systemPrompt: CHANNEL_POSTING_SYSTEM_PROMPT,
    userPrompt: buildPrompt()
  });
  let extraction;

  try {
    extraction = parseAndValidateChannelPosting(geminiResponse.text);
  } catch (_error) {
    geminiResponse = await callGemini({
      systemPrompt: CHANNEL_POSTING_SYSTEM_PROMPT,
      userPrompt: buildPrompt("Your previous response was malformed. Return only valid JSON matching the exact schema.")
    });

    try {
      extraction = parseAndValidateChannelPosting(geminiResponse.text);
    } catch (error) {
      throw new ApiError(502, "AI response was not valid JSON after retry", error.message);
    }
  }

  const analysis = await AIAnalysis.create({
    userId,
    type: "CHANNEL_POSTING",
    inputHash,
    jdTextHash: rawTextHash,
    result: extraction,
    model: env.geminiModel,
    tokenUsage: geminiResponse.usageMetadata
  });

  return { extraction, cached: false, analysis };
};

export const generateContactOutreachDraft = async ({ userId, contactId, purpose, context }) => {
  const contact = await Contact.findOne({ _id: contactId, userId });
  if (!contact) {
    throw new ApiError(404, "Contact not found");
  }

  const contactContext = [
    `Name: ${contact.name}`,
    `Company: ${contact.company}`,
    `Role: ${contact.role || "Not provided"}`,
    `Email: ${contact.email || "Not provided"}`,
    `Contact type: ${contact.contactType || "Not provided"}`,
    `Outreach status: ${contact.outreachStatus || "Not Contacted"}`,
    `Notes: ${contact.notes || "None"}`
  ].join("\n");

  const inputText = `${contactContext}\nPurpose: ${purpose || ""}\nAdditional context: ${context || ""}`;
  const inputHash = sha256(`contact-outreach-v1:${contactId}:${normalizeText(inputText)}`);
  const inputTextHash = sha256(normalizeText(inputText));

  const cached = await AIAnalysis.findOne({ userId, type: "CONTACT_OUTREACH", inputHash });
  if (cached) {
    return { draft: cached.result.draft, cached: true, analysis: cached };
  }

  await enforceRateLimit(userId, "CONTACT_OUTREACH");

  const buildPrompt = (repairInstruction) => `${repairInstruction ? `${repairInstruction}\n\n` : ""}Draft a networking outreach email from the user to this contact.

Contact:
${contactContext}

Purpose:
${purpose || "Ask for a referral or career advice"}

Additional context from user:
${context || "(none)"}`;

  let geminiResponse = await callGemini({
    systemPrompt: CONTACT_OUTREACH_SYSTEM_PROMPT,
    userPrompt: buildPrompt()
  });
  let result;

  try {
    result = parseAndValidateContactOutreach(geminiResponse.text);
  } catch (_error) {
    geminiResponse = await callGemini({
      systemPrompt: CONTACT_OUTREACH_SYSTEM_PROMPT,
      userPrompt: buildPrompt("Your previous response was malformed. Return only valid JSON matching the exact schema.")
    });

    try {
      result = parseAndValidateContactOutreach(geminiResponse.text);
    } catch (error) {
      throw new ApiError(502, "AI response was not valid JSON after retry", error.message);
    }
  }

  const analysis = await AIAnalysis.create({
    userId,
    type: "CONTACT_OUTREACH",
    inputHash,
    jdTextHash: inputTextHash,
    resumeContextHash: contactId,
    result,
    model: env.geminiModel,
    tokenUsage: geminiResponse.usageMetadata
  });

  return { draft: result.draft, cached: false, analysis };
};
