import { spawn } from "node:child_process";

function withTimeout(promise, ms, label) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  return Promise.resolve()
    .then(() => promise(controller.signal))
    .finally(() => clearTimeout(timeout))
    .catch((error) => {
      const reason = error?.name === "AbortError" ? "timeout" : error?.message || String(error);
      throw new Error(`${label} failed: ${reason}`);
    });
}

async function probeHttp(url) {
  const response = await fetch(url, { method: "GET" });
  return response.ok;
}

async function probeHttps(url) {
  const previous = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  try {
    const response = await fetch(url, { method: "GET" });
    return response.ok;
  } finally {
    if (previous === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    else process.env.NODE_TLS_REJECT_UNAUTHORIZED = previous;
  }
}

async function detectBaseUrl(hostAndPort) {
  const httpUrl = `http://${hostAndPort}/health`;
  try {
    const ok = await withTimeout(() => probeHttp(httpUrl), 2500, httpUrl);
    if (ok) return `http://${hostAndPort}`;
  } catch {}

  const httpsUrl = `https://${hostAndPort}/health`;
  try {
    const ok = await withTimeout(() => probeHttps(httpsUrl), 2500, httpsUrl);
    if (ok) return `https://${hostAndPort}`;
  } catch {}

  throw new Error(
    `Could not reach gateway healthcheck on ${hostAndPort}.\n` +
      `Tried: ${httpUrl} and ${httpsUrl}\n` +
      `Make sure the stack is up and the gateway is published on port 8000.`
  );
}

function toDockerPath(path) {
  return path.replaceAll("\\", "/");
}

function runGatling({ simulationClass, javaArgs }) {
  const baseUrl = process.env.BASE_URL;
  if (!baseUrl) {
    throw new Error("Missing BASE_URL after auto-detection.");
  }

  const cwd = toDockerPath(process.cwd());
  const args = [
    "run",
    "--rm",
    "-e",
    "BASE_URL",
    "-e",
    "BOT_MODE",
    "-e",
    "LOADTEST_USER_EMAIL",
    "-e",
    "LOADTEST_USER_PASSWORD",
    "-v",
    `${cwd}/load-tests:/opt/gatling/user-files`,
    "-v",
    `${cwd}/load-tests/conf:/opt/gatling/conf`,
    "-v",
    `${cwd}/load-tests/results:/opt/gatling/results`,
    "denvazh/gatling:latest",
    "-s",
    simulationClass,
    ...javaArgs,
  ];

  const child = spawn("docker", args, { stdio: "inherit" });
  child.on("exit", (code) => process.exit(code ?? 1));
}

async function main() {
  const simulationClass = process.argv[2] || process.env.GATLING_SIMULATION;
  if (!simulationClass) {
    console.error("Missing simulation class (e.g. simulations.GameBoardLoadSimulation).");
    process.exit(1);
  }

  // We probe from the host machine, so we should use localhost here.
  const probeHostAndPort = process.env.GATEWAY_HOST_PORT || "localhost:8000";
  // Gatling runs inside Docker, so it must use host.docker.internal to reach the host.
  const dockerHostAndPort = process.env.GATEWAY_DOCKER_HOST_PORT || "host.docker.internal:8000";

  if (!process.env.BASE_URL) {
    const detected = await detectBaseUrl(probeHostAndPort);
    const scheme = detected.startsWith("https://") ? "https" : "http";
    const dockerBaseUrl = `${scheme}://${dockerHostAndPort}`;
    process.env.BASE_URL = dockerBaseUrl;
    console.log(`Auto-detected gateway scheme=${scheme}. Using BASE_URL=${dockerBaseUrl}`);
  }

  const javaArgs = process.argv.slice(3);
  runGatling({ simulationClass, javaArgs });
}

main().catch((error) => {
  console.error(error?.message || String(error));
  process.exit(1);
});
