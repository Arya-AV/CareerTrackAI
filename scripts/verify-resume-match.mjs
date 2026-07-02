import mongoose from "mongoose";
import path from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: path.resolve("backend/.env") });

const stamp = Date.now();
const sampleResume = `Arya Verma
Software Engineering Student

Skills: JavaScript, React, Node.js, Express, MongoDB, REST APIs, Git, HTML, CSS, Jest, debugging, responsive UI.

Projects:
- Built a MERN job tracking dashboard with React, Express, MongoDB, JWT authentication, protected routes, and application status analytics.
- Created REST API endpoints for applications and user authentication using Node.js, Express, Mongoose, and bcrypt password hashing.
- Improved frontend usability with reusable form components, status badges, and loading states.
- Wrote Jest unit tests for utility functions and manually tested API workflows with Postman.

Experience:
- Campus coding club web lead, maintained event pages and fixed UI bugs across responsive layouts.
`;

const sampleJd = `Software Engineer Intern

We are hiring a Software Engineer Intern to build production web features. The role requires React, JavaScript, Node.js, Express, MongoDB, REST API development, Git, debugging, unit testing, and strong communication. Familiarity with authentication, CI/CD, cloud deployment, and data structures and algorithms is preferred.`;

const invalidResume = "hello hello not a resume";

const request = async (pathName, token, body) => {
  const response = await fetch(`http://localhost:5000${pathName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body)
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(`${pathName} failed ${response.status}: ${text}`);
  }

  return { status: response.status, data };
};

await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });

try {
  const signup = await request("/api/auth/signup", null, {
    name: "Resume Match Test User",
    email: `resume.match.${stamp}@example.com`,
    password: `TestPass-${stamp}!`
  });

  const token = signup.data.accessToken;
  const app = await request("/api/applications", token, {
    companyName: "Resume Match Co",
    role: "Software Engineer Intern",
    location: "Remote",
    appliedDate: new Date().toISOString().slice(0, 10),
    source: "LinkedIn",
    status: "Applied"
  });

  const valid = await request("/api/ai/resume-match", token, {
    resumeText: sampleResume,
    jdText: sampleJd,
    applicationId: app.data.application._id
  });

  const warning = await request("/api/ai/resume-match", token, {
    resumeText: invalidResume,
    jdText: sampleJd,
    applicationId: app.data.application._id
  });

  const analyses = mongoose.connection.collection("aianalyses");
  const savedValid = await analyses.findOne({
    _id: new mongoose.Types.ObjectId(valid.data.analysis.id),
    type: "RESUME_MATCH"
  });
  const savedWarning = await analyses.findOne({
    _id: new mongoose.Types.ObjectId(warning.data.analysis.id),
    type: "RESUME_MATCH"
  });

  const validResult = valid.data.analysis.result;
  const warningResult = warning.data.analysis.result;

  const validSchema =
    typeof validResult.match_percentage === "number" &&
    validResult.match_percentage >= 0 &&
    validResult.match_percentage <= 100 &&
    Array.isArray(validResult.matched_keywords) &&
    Array.isArray(validResult.missing_keywords) &&
    Array.isArray(validResult.bullet_suggestions) &&
    validResult.bullet_suggestions.every(
      (item) =>
        typeof item.original === "string" &&
        typeof item.improved === "string" &&
        typeof item.reason === "string"
    ) &&
    typeof validResult.score_justification === "string" &&
    validResult.warning === null;

  const warningSchema =
    warningResult.match_percentage === 0 &&
    Array.isArray(warningResult.matched_keywords) &&
    warningResult.matched_keywords.length === 0 &&
    Array.isArray(warningResult.missing_keywords) &&
    warningResult.missing_keywords.length === 0 &&
    Array.isArray(warningResult.bullet_suggestions) &&
    warningResult.bullet_suggestions.length === 0 &&
    typeof warningResult.warning === "string";

  console.log(
    JSON.stringify(
      {
        testUser: signup.data.user.email,
        applicationId: app.data.application._id,
        validResumeMatch: {
          status: valid.status,
          saved: Boolean(savedValid),
          linkedToApplication: savedValid?.applicationId?.toString() === app.data.application._id,
          schemaValid: validSchema,
          matchPercentage: validResult.match_percentage,
          matchedKeywordCount: validResult.matched_keywords.length,
          missingKeywordCount: validResult.missing_keywords.length,
          bulletSuggestionCount: validResult.bullet_suggestions.length,
          warning: validResult.warning
        },
        invalidInput: {
          status: warning.status,
          saved: Boolean(savedWarning),
          schemaValid: warningSchema,
          warning: warningResult.warning
        }
      },
      null,
      2
    )
  );
} finally {
  await mongoose.disconnect();
}
