import "../src/loadEnv.js";
import fs from "node:fs";
import net from "node:net";
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const frontendDir = path.join(rootDir, "frontend");
const standaloneFrontendServer = path.join(frontendDir, "server.js");
const shouldOpenBrowser = !process.argv.includes("--no-open");
const preferredBackendPort = normalizePort(process.env.PORT, 3000);
const preferredFrontendPort = normalizePort(process.env.FRONTEND_PORT, 3011);
const host = "127.0.0.1";

let isShuttingDown = false;
let backendProcess = null;
let frontendProcess = null;

main().catch((error) => {
  console.error("Launch error:", error);
  shutdown(1);
});

async function main() {
  const backendPort = await findAvailablePort(preferredBackendPort);
  const frontendPort = await findAvailablePort(preferredFrontendPort);
  const backendUrl = `http://${host}:${backendPort}`;
  const frontendUrl = `http://${host}:${frontendPort}`;

  backendProcess = spawn(process.execPath, ["src/server/index.js"], {
    cwd: rootDir,
    stdio: "inherit",
    env: {
      ...process.env,
      SERVER_HOST: host,
      PORT: String(backendPort)
    }
  });

  backendProcess.once("exit", (code, signal) => {
    if (isShuttingDown) {
      return;
    }

    terminateFrontendProcess();

    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 0);
  });

  frontendProcess = fsExists(standaloneFrontendServer)
    ? spawn(process.execPath, ["server.js"], {
        cwd: frontendDir,
        stdio: "inherit",
        env: {
          ...process.env,
          BACKEND_URL: backendUrl,
          HOSTNAME: host,
          PORT: String(frontendPort)
        }
      })
    : spawn(
        process.execPath,
        [
          "node_modules/next/dist/bin/next",
          "start",
          "--hostname",
          host,
          "--port",
          String(frontendPort)
        ],
        {
          cwd: frontendDir,
          stdio: "inherit",
          env: {
            ...process.env,
            BACKEND_URL: backendUrl
          }
        }
      );

  frontendProcess.once("exit", (code, signal) => {
    if (isShuttingDown) {
      return;
    }

    terminateBackendProcess();

    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 0);
  });

  process.on("SIGINT", () => shutdown(0));
  process.on("SIGTERM", () => shutdown(0));

  console.log(`Backend:  ${backendUrl}`);
  console.log(`Frontend: ${frontendUrl}`);
  console.log("Press Ctrl+C to stop.");

  const [backendReady, frontendReady] = await Promise.all([
    waitForServer(`${backendUrl}/api/health`),
    waitForServer(frontendUrl)
  ]);

  if (!backendReady) {
    throw new Error(`Backend did not become ready at ${backendUrl}.`);
  }

  if (!frontendReady) {
    throw new Error(`Frontend did not become ready at ${frontendUrl}.`);
  }

  if (shouldOpenBrowser && !isShuttingDown) {
    openBrowser(frontendUrl);
    console.log(`Opened ${frontendUrl}`);
  }
}

async function waitForServer(url) {
  const deadline = Date.now() + 30000;

  while (!isShuttingDown && Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return true;
      }
    } catch {
      // still booting
    }

    await sleep(250);
  }

  return false;
}

async function findAvailablePort(startPort) {
  for (let port = startPort; port < startPort + 50; port += 1) {
    const inUse = await isPortInUse(port);
    if (!inUse) {
      return port;
    }
  }

  throw new Error(`Could not find an open port starting at ${startPort}.`);
}

function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once("error", () => resolve(true));
    server.once("listening", () => {
      server.close(() => resolve(false));
    });

    server.listen(port, host);
  });
}

function openBrowser(url) {
  if (process.platform === "win32") {
    spawn("cmd.exe", ["/c", "start", "", url], {
      detached: true,
      stdio: "ignore"
    }).unref();
    return;
  }

  const command = process.platform === "darwin" ? "open" : "xdg-open";
  spawn(command, [url], { detached: true, stdio: "ignore" }).unref();
}

function shutdown(exitCode) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  terminateFrontendProcess();
  terminateBackendProcess();
  process.exit(exitCode);
}

function terminateBackendProcess() {
  if (!backendProcess || backendProcess.exitCode !== null || !backendProcess.pid) {
    return;
  }

  terminateProcessTree(backendProcess.pid, backendProcess);
}

function terminateFrontendProcess() {
  if (!frontendProcess || frontendProcess.exitCode !== null || !frontendProcess.pid) {
    return;
  }

  terminateProcessTree(frontendProcess.pid, frontendProcess);
}

function terminateProcessTree(pid, childProcess) {
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(pid), "/t", "/f"], {
      stdio: "ignore"
    });
    return;
  }

  childProcess.kill("SIGTERM");
}

function normalizePort(value, fallbackPort) {
  const parsed = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackPort;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fsExists(targetPath) {
  return Boolean(targetPath) && fs.existsSync(targetPath);
}
