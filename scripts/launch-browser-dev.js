import "dotenv/config";
import { spawn, spawnSync } from "node:child_process";
import { buildConfig } from "../src/server/config/env.js";

const config = buildConfig();
const browserUrl = buildBrowserUrl(config.host, config.port);
const shouldOpenBrowser = !process.argv.includes("--no-open");
const serverProcess = spawn(
  process.execPath,
  ["--watch", "src/server/index.js"],
  {
    cwd: process.cwd(),
    stdio: "inherit"
  }
);

let isShuttingDown = false;

console.log(`Starting browser dev server at ${browserUrl}`);
console.log("Press Ctrl+C to stop.");

serverProcess.once("exit", (code, signal) => {
  if (isShuttingDown) {
    return;
  }

  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});

if (shouldOpenBrowser) {
  waitForServer(browserUrl)
    .then((isReady) => {
      if (!isReady || isShuttingDown) {
        return;
      }

      openBrowser(browserUrl);
      console.log(`Opened ${browserUrl}`);
    })
    .catch((error) => {
      console.warn(`Could not auto-open the browser: ${error.message}`);
    });
}

process.on("SIGINT", () => {
  shutdown(0);
});

process.on("SIGTERM", () => {
  shutdown(0);
});

function buildBrowserUrl(host, port) {
  const browserHost =
    host === "0.0.0.0" || host === "::" || host === "[::]" ? "127.0.0.1" : host;

  return `http://${browserHost}:${port}`;
}

async function waitForServer(url) {
  const healthUrl = new URL("/api/health", url);
  const deadline = Date.now() + 30000;

  while (!isShuttingDown && Date.now() < deadline) {
    try {
      const response = await fetch(healthUrl);

      if (response.ok) {
        return true;
      }
    } catch (error) {
      // The watch process may still be booting. Keep polling briefly.
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 250);
    });
  }

  return false;
}

function openBrowser(url) {
  if (process.platform === "win32") {
    spawn("cmd.exe", ["/c", "start", "", url], {
      detached: true,
      stdio: "ignore"
    }).unref();
    return;
  }

  const openCommand = process.platform === "darwin" ? "open" : "xdg-open";

  spawn(openCommand, [url], {
    detached: true,
    stdio: "ignore"
  }).unref();
}

function shutdown(exitCode) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  terminateServerProcess();
  process.exit(exitCode);
}

function terminateServerProcess() {
  if (serverProcess.exitCode !== null || !serverProcess.pid) {
    return;
  }

  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(serverProcess.pid), "/t", "/f"], {
      stdio: "ignore"
    });
    return;
  }

  serverProcess.kill("SIGTERM");
}
