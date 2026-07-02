import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import mongoose from "mongoose";
import { config as loadEnv } from "dotenv";

loadEnv({ path: path.resolve("backend/.env") });

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const debugPort = 9222;
const frontendUrl = "http://localhost:5173";
const userDataDir = path.resolve(".tmp/chrome-auth-verify");
const stamp = Date.now();
const testUser = {
  name: "CareerTrack Test User",
  email: `careertrack.test.${stamp}@example.com`,
  password: `TestPass-${stamp}!`
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchJson = async (url, options) => {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} for ${url}`);
  }

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
        if (message.error) {
          reject(new Error(message.error.message));
        } else {
          resolve(message.result);
        }
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
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
  }

  close() {
    this.ws.close();
  }
}

const waitForExpression = async (client, expression, timeoutMs = 10000) => {
  const startedAt = Date.now();
  let lastValue;

  while (Date.now() - startedAt < timeoutMs) {
    const result = await client.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true
    });

    lastValue = result.result.value;
    if (result.result.value) {
      return result.result.value;
    }

    await wait(250);
  }

  const debug = await client.send("Runtime.evaluate", {
    expression: "({ href: location.href, title: document.title, body: document.body && document.body.innerText.slice(0, 300) })",
    returnByValue: true
  });

  throw new Error(
    `Timed out waiting for expression: ${expression}. Last value: ${lastValue}. Page: ${JSON.stringify(debug.result.value)}. Events: ${JSON.stringify(client.events.slice(-10))}`
  );
};

const evaluate = async (client, expression) =>
  client.send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true
  });

const fillAndSubmit = async (client, fields, submitText) => {
  const script = `
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
      const button = Array.from(document.querySelectorAll('button')).find((node) => node.textContent.trim() === ${JSON.stringify(submitText)});
      if (!button) return 'missing:button';
      button.click();
      return 'submitted';
    })()
  `;

  const result = await evaluate(client, script);
  if (result.result.value !== "submitted") {
    throw new Error(`Form submit failed: ${result.result.value}`);
  }
};

const getUserSnapshot = async () => {
  const users = mongoose.connection.collection("users");
  const user = await users.findOne({ email: testUser.email });

  if (!user) {
    return null;
  }

  return {
    id: user._id.toString(),
    email: user.email,
    hasPasswordHash: Boolean(user.passwordHash),
    passwordHashLooksBcrypt: typeof user.passwordHash === "string" && user.passwordHash.startsWith("$2"),
    passwordHashEqualsPlaintext: user.passwordHash === testUser.password,
    refreshTokens: user.refreshTokens.map((token) => ({
      tokenHash: token.tokenHash,
      familyId: token.familyId,
      revoked: Boolean(token.revokedAt),
      replaced: Boolean(token.replacedByTokenHash)
    }))
  };
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
  if (!page) {
    throw new Error("No Chrome page target found");
  }

  client = new CdpClient(page.webSocketDebuggerUrl);
  await client.open();
  await client.send("Runtime.enable");
  await client.send("Log.enable");
  await client.send("Page.enable");
  await client.send("Page.navigate", { url: `${frontendUrl}/signup` });
  await wait(1000);

  await waitForExpression(client, "location.pathname === '/signup' && !!document.querySelector('form')");
  await fillAndSubmit(
    client,
    { name: testUser.name, email: testUser.email, password: testUser.password },
    "Create account"
  );
  await waitForExpression(client, "location.pathname === '/app/dashboard'");

  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  const afterSignup = await getUserSnapshot();

  await evaluate(client, `document.querySelector('[aria-label="Log out"]').click()`);
  await waitForExpression(client, "Array.from(document.querySelectorAll('button')).some((button) => button.textContent.trim() === 'Log out')");
  await evaluate(
    client,
    `Array.from(document.querySelectorAll('button')).find((button) => button.textContent.trim() === 'Log out').click()`
  );
  await waitForExpression(client, "location.pathname === '/login'");

  const afterLogout = await getUserSnapshot();

  await fillAndSubmit(client, { email: testUser.email, password: testUser.password }, "Log in");
  await waitForExpression(client, "location.pathname === '/app/dashboard'");

  const afterLogin = await getUserSnapshot();

  await client.send("Page.reload", { ignoreCache: true });
  await waitForExpression(client, "location.pathname === '/app/dashboard'");
  await wait(1000);

  const afterReloadRefresh = await getUserSnapshot();

  const summarizeTokens = (snapshot) => ({
    total: snapshot.refreshTokens.length,
    active: snapshot.refreshTokens.filter((token) => !token.revoked).length,
    revoked: snapshot.refreshTokens.filter((token) => token.revoked).length,
    replaced: snapshot.refreshTokens.filter((token) => token.replaced).length,
    activeFamilies: Array.from(
      new Set(snapshot.refreshTokens.filter((token) => !token.revoked).map((token) => token.familyId))
    ).length
  });

  console.log(
    JSON.stringify(
      {
        testUser: {
          email: testUser.email
        },
        signupReachedDashboard: true,
        loginReachedDashboard: true,
        reloadStayedOnDashboard: true,
        mongoUserFound: Boolean(afterSignup),
        passwordHash: {
          present: afterSignup.hasPasswordHash,
          looksBcrypt: afterSignup.passwordHashLooksBcrypt,
          equalsPlaintext: afterSignup.passwordHashEqualsPlaintext
        },
        refreshTokens: {
          afterSignup: summarizeTokens(afterSignup),
          afterLogout: summarizeTokens(afterLogout),
          afterLogin: summarizeTokens(afterLogin),
          afterReloadRefresh: summarizeTokens(afterReloadRefresh)
        },
        rotationVerified:
          summarizeTokens(afterLogin).active === 1 &&
          summarizeTokens(afterReloadRefresh).active === 1 &&
          summarizeTokens(afterReloadRefresh).total === summarizeTokens(afterLogin).total + 1 &&
          summarizeTokens(afterReloadRefresh).revoked === summarizeTokens(afterLogin).revoked + 1 &&
          summarizeTokens(afterReloadRefresh).replaced === summarizeTokens(afterLogin).replaced + 1
      },
      null,
      2
    )
  );
} finally {
  if (client) {
    client.close();
  }

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  if (chrome) {
    chrome.kill();
  }
}
