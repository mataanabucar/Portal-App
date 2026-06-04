import "dotenv/config";
import { spawn, spawnSync } from "node:child_process";
import { buildGraphTesterConfig } from "../src/graph-tester/config.js";

const config = buildGraphTesterConfig();
const browserUrl = `http://${config.browserHost}:${config.port}`;
const shouldWatch = process.argv.includes("--watch");
const shouldOpenBrowser = !process.argv.includes("--no-open");
const nodeArguments = shouldWatch
  ? ["--watch", "src/graph-tester/index.js"]
  : ["src/graph-tester/index.js"];
const serverProcess = spawn(process.execPath, nodeArguments, {
  cwd: process.cwd(),
  stdio: "inherit",
});

let isShuttingDown = false;

console.log(`Starting Graph Tester at ${browserUrl}`);
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
      console.warn(`Could not auto-open the Graph Tester browser window: ${error.message}`);
    });
}

process.on("SIGINT", () => {
  shutdown(0);
});

process.on("SIGTERM", () => {
  shutdown(0);
});

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
      // The Graph tester may still be booting. Keep polling briefly.
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
      stdio: "ignore",
    }).unref();
    return;
  }

  const openCommand = process.platform === "darwin" ? "open" : "xdg-open";

  spawn(openCommand, [url], {
    detached: true,
    stdio: "ignore",
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
      stdio: "ignore",
    });
    return;
  }

  serverProcess.kill("SIGTERM");
}
