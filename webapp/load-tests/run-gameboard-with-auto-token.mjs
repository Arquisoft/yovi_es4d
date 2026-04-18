import { spawn } from "node:child_process";

const baseUrl = process.env.BASE_URL ?? "http://host.docker.internal:8000";
const email = process.env.LOADTEST_USER_EMAIL;
const password = process.env.LOADTEST_USER_PASSWORD;

if (!email || !password) {
  console.error("Missing credentials. Set LOADTEST_USER_EMAIL and LOADTEST_USER_PASSWORD.");
  process.exit(1);
}

async function getToken() {
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
  console.error(`Auto-token flow failed: ${error.message}`);
  process.exit(1);
}
