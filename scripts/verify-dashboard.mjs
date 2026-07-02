import mongoose from "mongoose";
import path from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: path.resolve("backend/.env") });

const stamp = Date.now();
const email = `dashboard.${stamp}@example.com`;

const request = async (pathName, token, options = {}) => {
  const response = await fetch(`http://localhost:5000${pathName}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`${pathName} failed ${response.status}: ${text}`);
  return data;
};

await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });

try {
  const signup = await request("/api/auth/signup", null, {
    method: "POST",
    body: JSON.stringify({
      name: "Dashboard Test User",
      email,
      password: `TestPass-${stamp}!`
    })
  });

  const token = signup.accessToken;
  const applications = [
    ["Acme AI", "Frontend Intern", "Applied", "2026-01-10"],
    ["Acme AI", "Backend Intern", "OA", "2026-01-20"],
    ["ByteWorks", "SWE Intern", "Interview", "2026-02-05"],
    ["ByteWorks", "Platform Intern", "Offer", "2026-02-16"],
    ["CloudNine", "Full Stack Intern", "Rejected", "2026-03-02"],
    ["Acme AI", "ML Intern", "Offer", "2026-03-12"]
  ];

  for (const [companyName, role, status, appliedDate] of applications) {
    await request("/api/applications", token, {
      method: "POST",
      body: JSON.stringify({
        companyName,
        role,
        status,
        appliedDate,
        source: "LinkedIn",
        location: "Remote"
      })
    });
  }

  const [summary, company, monthly] = await Promise.all([
    request("/api/dashboard/summary", token),
    request("/api/dashboard/company-status", token),
    request("/api/dashboard/monthly-volume", token)
  ]);

  const expected = {
    totalApplications: 6,
    oaShortlistedCount: 1,
    interviewCount: 1,
    rejectionCount: 1,
    offerCount: 2,
    successRate: 33.3
  };

  const summaryMatches = Object.entries(expected).every(
    ([key, value]) => summary.summary[key] === value
  );

  const monthlyExpected = {
    "2026-01": 2,
    "2026-02": 2,
    "2026-03": 2
  };
  const monthlyMatches = monthly.rows.every((row) => monthlyExpected[row.label] === row.count);

  const acme = company.rows.find((row) => row.companyName === "Acme AI");
  const acmeOffer = acme?.statuses.find((item) => item.status === "Offer")?.count || 0;
  const companyMatches = acme?.total === 3 && acmeOffer === 1;

  console.log(
    JSON.stringify(
      {
        user: email,
        summary: summary.summary,
        summaryMatches,
        monthly: monthly.rows,
        monthlyMatches,
        companyRows: company.rows,
        companyMatches
      },
      null,
      2
    )
  );
} finally {
  await mongoose.disconnect();
}
