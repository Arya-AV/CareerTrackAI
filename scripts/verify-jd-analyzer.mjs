import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import mongoose from "mongoose";
import { config as loadEnv } from "dotenv";

loadEnv({ path: path.resolve("backend/.env") });

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const debugPort = 9223;
const frontendUrl = "http://localhost:5173";
const userDataDir = path.resolve(".tmp/chrome-jd-analyzer-verify");
const stamp = Date.now();
const testUser = {
  name: "JD Analyzer Test User",
  email: `jd.analyzer.${stamp}@example.com`,
  password: `TestPass-${stamp}!`
};

const validJd = `Software Engineer Intern

We are looking for a Software Engineer Intern to join our platform team. You will build React user interfaces, Node.js and Express APIs, and work with MongoDB. The role requires JavaScript, REST APIs, Git, unit testing, debugging, and clear communication. Familiarity with data structures and algorithms, arrays, strings, hash maps, recursion, and basic dynamic programming is preferred. Experience with cloud deployment, CI/CD, and authentication is a plus.`;

const invalidJd = "banana chair moon beep beep this is not a job post";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchJson = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.json();
};

class CdpClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.nextId = 1;
    this.pending = new Map();
    this.events = [];

    this.ws.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(message.error.message));
        else resolve(message.result);
        return;
      }
      this.events.push(message);
    });
  }

  async open() {
    await new Promise((resolve, reject) => {
      this.ws.addEventListener("open", resolve, { once: true });
      this.ws.addEventListener("error", reject, { once: true });
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }

  close() {
    this.ws.close();
  }
}

const evaluate = (client, expression) =>
  client.send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true
  });

const waitForExpression = async (client, expression, timeoutMs = 15000) => {
  const startedAt = Date.now();
  let lastValue;

  while (Date.now() - startedAt < timeoutMs) {
    const result = await evaluate(client, expression);
    lastValue = result.result.value;
    if (lastValue) return lastValue;
    await wait(300);
  }

  const debug = await evaluate(
    client,
    "({ href: location.href, title: document.title, body: document.body && document.body.innerText.slice(0, 500) })"
  );
  throw new Error(
    `Timed out: ${expression}. Last: ${lastValue}. Page: ${JSON.stringify(debug.result.value)}. Events: ${JSON.stringify(client.events.slice(-20))}`
  );
};

const fillFields = async (client, fields) => {
  const result = await evaluate(
    client,
    `
      (() => {
        const fields = ${JSON.stringify(fields)};
        for (const [name, value] of Object.entries(fields)) {
          const input = document.querySelector('[name="' + name + '"]');
          if (!input) return 'missing:' + name;
          const setter = Object.getOwnPropertyDescriptor(input.constructor.prototype, 'value').set;
          setter.call(input, value);
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
        return 'filled';
      })()
    `
  );

  if (result.result.value !== "filled") throw new Error(`Fill failed: ${result.result.value}`);
};

const clickButton = async (client, text) => {
  const result = await evaluate(
    client,
    `
      (() => {
        const button = Array.from(document.querySelectorAll('button')).find((node) => node.textContent.includes(${JSON.stringify(text)}));
        if (!button) return 'missing:button';
        button.click();
        return 'clicked';
      })()
    `
  );

  if (result.result.value !== "clicked") throw new Error(`Click failed: ${result.result.value}`);
};

const selectFirstApplication = async (client) => {
  const result = await evaluate(
    client,
    `
      (() => {
        const select = document.querySelector('select');
        if (!select || select.options.length < 2) return 'missing:application';
        const setter = Object.getOwnPropertyDescriptor(select.constructor.prototype, 'value').set;
        setter.call(select, select.options[1].value);
        select.dispatchEvent(new Event('change', { bubbles: true }));
        return select.options[1].value;
      })()
    `
  );

  if (!result.result.value || result.result.value === "missing:application") {
    throw new Error("Could not select linked application");
  }

  return result.result.value;
};

let chrome;
let client;

try {
  await mkdir(userDataDir, { recursive: true });
  chrome = spawn(chromePath, [
    "--headless=new",
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${userDataDir}`,
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    `${frontendUrl}/signup`
  ]);

  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      await fetchJson(`http://localhost:${debugPort}/json/version`);
      break;
    } catch (_error) {
      await wait(250);
    }
  }

  const targets = await fetchJson(`http://localhost:${debugPort}/json`);
  const page = targets.find((target) => target.type === "page");
  client = new CdpClient(page.webSocketDebuggerUrl);
  await client.open();
  await client.send("Runtime.enable");
  await client.send("Page.enable");
  await client.send("Network.enable");
  await client.send("Page.navigate", { url: `${frontendUrl}/signup` });

  await waitForExpression(client, "location.pathname === '/signup' && !!document.querySelector('form')");
  await fillFields(client, { name: testUser.name, email: testUser.email, password: testUser.password });
  await clickButton(client, "Create account");
  await waitForExpression(client, "location.pathname === '/app/dashboard'");

  await client.send("Page.navigate", { url: `${frontendUrl}/app/applications/new` });
  await waitForExpression(client, "location.pathname === '/app/applications/new' && !!document.querySelector('form')");
  await fillFields(client, {
    companyName: "Acme AI",
    role: "Software Engineer Intern",
    location: "Remote",
    appliedDate: new Date().toISOString().slice(0, 10),
    source: "LinkedIn",
    notes: "Created by JD Analyzer verification."
  });
  await clickButton(client, "Save application");
  const detailPath = await waitForExpression(
    client,
    "/^\\/app\\/applications\\/[a-f0-9]{24}$/.test(location.pathname) && location.pathname"
  );
  const applicationId = detailPath.split("/").pop();

  await client.send("Page.navigate", { url: `${frontendUrl}/app/ai/jd-analyzer` });
  await waitForExpression(client, "location.pathname === '/app/ai/jd-analyzer' && !!document.querySelector('textarea')");
  await waitForExpression(client, "document.querySelector('select') && document.querySelector('select').options.length > 1");
  const selectedApplicationId = await selectFirstApplication(client);
  await fillFields(client, { jdText: validJd });
  await clickButton(client, "Analyze JD");
  await waitForExpression(
    client,
    "document.body.innerText.toLowerCase().includes('new analysis saved') || document.body.innerText.toLowerCase().includes('loaded from cache')",
    90000
  );

  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  const analyses = mongoose.connection.collection("aianalyses");
  const savedValid = await analyses.findOne({
    applicationId: new mongoose.Types.ObjectId(applicationId),
    type: "JD_ANALYSIS"
  });

  const validShape = Boolean(
    savedValid &&
      Array.isArray(savedValid.result.required_skills) &&
      Array.isArray(savedValid.result.missing_skills) &&
      Array.isArray(savedValid.result.resume_keyword_suggestions) &&
      Array.isArray(savedValid.result.prep_checklist) &&
      Array.isArray(savedValid.result.dsa_topics_to_revise) &&
      Object.prototype.hasOwnProperty.call(savedValid.result, "warning") &&
      savedValid.result.warning === null
  );

  await fillFields(client, { jdText: invalidJd });
  await clickButton(client, "Analyze JD");
  await waitForExpression(client, "document.body.innerText.includes('Check the input')", 90000);

  const savedWarning = await analyses.findOne({
    userId: savedValid.userId,
    type: "JD_ANALYSIS",
    "result.warning": { $ne: null }
  });

  const warningShape = Boolean(
    savedWarning &&
      Array.isArray(savedWarning.result.required_skills) &&
      savedWarning.result.required_skills.length === 0 &&
      typeof savedWarning.result.warning === "string"
  );

  console.log(
    JSON.stringify(
      {
        testUser: testUser.email,
        applicationId,
        selectedApplicationId,
        validJd: {
          saved: Boolean(savedValid),
          linkedToApplication: savedValid?.applicationId?.toString() === applicationId,
          schemaValid: validShape,
          warning: savedValid?.result.warning,
          requiredSkillsCount: savedValid?.result.required_skills.length,
          missingSkillsCount: savedValid?.result.missing_skills.length,
          dsaTopicsCount: savedValid?.result.dsa_topics_to_revise.length
        },
        invalidInput: {
          saved: Boolean(savedWarning),
          schemaValid: warningShape,
          warning: savedWarning?.result.warning
        }
      },
      null,
      2
    )
  );
} finally {
  if (client) client.close();
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  if (chrome) chrome.kill();
}
