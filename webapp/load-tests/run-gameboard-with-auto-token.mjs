import { spawn } from "node:child_process";

const baseUrl = process.env.BASE_URL ?? "http://host.docker.internal:8000";
const email = process.env.LOADTEST_USER_EMAIL;
const password = process.env.LOADTEST_USER_PASSWORD;
const insecureTls = (process.env.LOADTEST_INSECURE_TLS ?? "").toLowerCase() === "true";

if (!email || !password) {
  console.error("Missing credentials. Set LOADTEST_USER_EMAIL and LOADTEST_USER_PASSWORD.");
  process.exit(1);
}

async function getToken() {
  if (baseUrl.startsWith("https://") && insecureTls) {
    // Local-only helper for self-signed certificates.
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  }

  const response = await fetch(`${baseUrl}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Login failed with status ${response.status}: ${body}`);
  }

  const setCookie = response.headers.get("set-cookie") ?? "";
  const match = setCookie.match(/token=([^;]+)/);
  if (!match || !match[1]) {
    throw new Error("Login succeeded but token cookie was not found in Set-Cookie.");
  }

  return match[1];
}

function runLoadtest(token) {
  const env = { ...process.env, LOADTEST_AUTH_TOKEN: token };
  const command = process.platform === "win32" ? "npm.cmd" : "npm";
  const child = spawn(command, ["run", "loadtest:gameboard"], { stdio: "inherit", env });
  child.on("exit", (code) => process.exit(code ?? 1));
}

try {
  const token = await getToken();
  console.log("Token fetched successfully. Running GameBoard load test...");
  runLoadtest(token);
} catch (error) {
  if (baseUrl.startsWith("https://") && !insecureTls) {
    console.error(
      `Auto-token flow failed: ${error.message}\n` +
      `Hint: you're using HTTPS. If the target uses a self-signed certificate, set LOADTEST_INSECURE_TLS=true.`
    );
    process.exit(1);
  }

  console.error(`Auto-token flow failed: ${error.message}`);
  process.exit(1);
}
