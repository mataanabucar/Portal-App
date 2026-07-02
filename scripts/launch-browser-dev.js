import "../src/loadEnv.js";
import net from "node:net";
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildConfig } from "../src/server/config/env.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const frontendDir = path.join(rootDir, "frontend");

const config = buildConfig();
const backendUrl = buildBrowserUrl(config.host, config.port);
const frontendPort = 3011;
const browserUrl = `http://localhost:${frontendPort}`;
const shouldOpenBrowser = !process.argv.includes("--no-open");

let isShuttingDown = false;
let serverProcess = null;
let frontendProcess = null;

function isPortInUse(port) {
  return new Promise((resolve) => {
    const probe = net.createServer();
    probe.once("error", () => resolve(true));
    probe.once("listening", () => { probe.close(); resolve(false); });
    probe.listen(port, "127.0.0.1");
  });
}

async function main() {
  serverProcess = spawn(
    process.execPath,
    ["--watch", "src/server/index.js"],
    { cwd: rootDir, stdio: "inherit" }
  );

  serverProcess.once("exit", (code, signal) => {
    if (isShuttingDown) return;
    terminateFrontendProcess();
    if (signal) { process.kill(process.pid, signal); return; }
    process.exit(code ?? 0);
  });

  const portTaken = await isPortInUse(frontendPort);

  if (portTaken) {
    console.log(`[frontend] Port ${frontendPort} already in use — reusing existing server.`);
  } else {
    frontendProcess = spawn("npm", ["run", "dev"], {
      cwd: frontendDir,
      stdio: "inherit",
      shell: true,
    });

    frontendProcess.once("exit", (code, signal) => {
      if (isShuttingDown) return;
      terminateServerProcess();
      if (signal) { process.kill(process.pid, signal); return; }
      process.exit(code ?? 0);
    });
  }

  console.log(`Backend:  ${backendUrl}`);
  console.log(`Frontend: ${browserUrl}`);
  console.log("Press Ctrl+C to stop.");

  process.on("SIGINT", () => shutdown(0));
  process.on("SIGTERM", () => shutdown(0));

  if (shouldOpenBrowser) {
    waitForServer(backendUrl)
      .then((isReady) => {
        if (!isReady || isShuttingDown) return;
        openBrowser(browserUrl);
        console.log(`Opened ${browserUrl}`);
      })
      .catch((error) => {
        console.warn(`Could not auto-open the browser: ${error.message}`);
      });
  }
}

main().catch((err) => {
  console.error("Launch error:", err);
  process.exit(1);
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
      if (response.ok) return true;
    } catch {
      // still booting
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  return false;
}

function openBrowser(url) {
  if (process.platform === "win32") {
    spawn("cmd.exe", ["/c", "start", "", url], { detached: true, stdio: "ignore" }).unref();
    return;
  }
  const cmd = process.platform === "darwin" ? "open" : "xdg-open";
  spawn(cmd, [url], { detached: true, stdio: "ignore" }).unref();
}

function shutdown(exitCode) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  terminateServerProcess();
  terminateFrontendProcess();
  process.exit(exitCode);
}

function terminateServerProcess() {
  if (!serverProcess || serverProcess.exitCode !== null || !serverProcess.pid) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(serverProcess.pid), "/t", "/f"], { stdio: "ignore" });
    return;
  }
  serverProcess.kill("SIGTERM");
}

function terminateFrontendProcess() {
  if (!frontendProcess || frontendProcess.exitCode !== null || !frontendProcess.pid) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(frontendProcess.pid), "/t", "/f"], { stdio: "ignore" });
    return;
  }
  frontendProcess.kill("SIGTERM");
}
