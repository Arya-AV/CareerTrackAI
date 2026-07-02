import mongoose from "mongoose";
import path from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: path.resolve("backend/.env") });

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

const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });

try {
  const stamp = Date.now();
  const signup = await request("/api/auth/signup", null, {
    method: "POST",
    body: JSON.stringify({
      name: "Momentum Test User",
      email: `momentum.${stamp}@example.com`,
      password: `TestPass-${stamp}!`
    })
  });
  const token = signup.accessToken;
  const applications = mongoose.connection.collection("applications");

  const currentApps = [
    ["Current A", "Applied", daysAgo(1), daysAgo(1)],
    ["Current B", "OA", daysAgo(2), daysAgo(1.5)],
    ["Current C", "Interview", daysAgo(3), daysAgo(2)],
    ["Current D", "Applied", daysAgo(4), daysAgo(4)],
    ["Current E", "Rejected", daysAgo(5), daysAgo(4.5)],
    ["Current F", "Offer", daysAgo(6), daysAgo(5.5)]
  ];

  const previousApps = [
    ["Previous A", "Applied", daysAgo(8), daysAgo(8)],
    ["Previous B", "OA", daysAgo(10), daysAgo(9.5)]
  ];

  for (const [companyName, status, appliedDate, updatedAt] of [...currentApps, ...previousApps]) {
    await applications.insertOne({
      userId: new mongoose.Types.ObjectId(signup.user.id),
      companyName,
      role: "SWE Intern",
      location: "Remote",
      appliedDate,
      deadline: null,
      status,
      source: "LinkedIn",
      jobLink: "",
      notes: "",
      tags: [],
      createdAt: appliedDate,
      updatedAt
    });
  }

  const momentum = await request("/api/dashboard/momentum", token);
  const current = momentum.momentum.current;
  const previous = momentum.momentum.previous;

  console.log(
    JSON.stringify(
      {
        current,
        previous,
        trend: momentum.momentum.trend,
        delta: momentum.momentum.delta,
        nudge: momentum.momentum.nudge,
        verified:
          current.applicationsSent === 6 &&
          current.responsesReceived === 4 &&
          current.completedFollowUpReminders === 0 &&
          Boolean(momentum.momentum.nudge) &&
          previous.applicationsSent === 2
      },
      null,
      2
    )
  );
} finally {
  await mongoose.disconnect();
}
