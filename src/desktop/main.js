import { app, BrowserWindow, dialog, shell } from "electron";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const initialWorkingDirectory = process.cwd();
const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);
const projectRoot = path.resolve(currentDirectory, "..", "..");
const bootstrapLogPath = path.join(
  os.tmpdir(),
  "portal-visualizer-shell-bootstrap.log"
);

let mainWindow = null;
let serverHandle = null;
let frontendProcess = null;
let frontendPort = 0; // assigned dynamically (a free port) before spawning Next.js
let startServer = null;
let isQuitting = false;
let desktopLogPath = "";

appendBootstrapLog(`Module loaded from ${currentFile}`);

const hasSingleInstanceLock = app.requestSingleInstanceLock();

appendBootstrapLog(`Single instance lock result: ${hasSingleInstanceLock}`);

if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow) {
      return;
    }

    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }

    mainWindow.focus();
  });
}

app.setName("Portal Visualizer");

app.whenReady().then(async () => {
  try {
    prepareDesktopEnvironment();
    logDesktop("Electron app ready.");
    ({ startServer } = await import("../server/index.js"));
    logDesktop("Imported desktop server entry.");
    await createMainWindow();
  } catch (error) {
    logDesktop(`Fatal startup error: ${error?.stack || error}`);
    await showFatalError(error);
  }
});

app.on("activate", async () => {
  if (BrowserWindow.getAllWindows().length > 0) {
    return;
  }

  try {
    await createMainWindow();
  } catch (error) {
    await showFatalError(error);
  }
});

app.on("before-quit", () => {
  isQuitting = true;
  void stopServer();
  stopFrontend();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

async function createMainWindow() {
  if (!startServer) {
    throw new Error("Desktop server bootstrap is not ready.");
  }

  if (!serverHandle) {
    logDesktop("Starting embedded Express server.");
    serverHandle = startServer({
      host: "127.0.0.1",
      port: 0,
      playwrightUserDataDir: path.join(
        app.getPath("userData"),
        "browser-profile"
      )
    });
    await serverHandle.ready;
    logDesktop(`Express server ready on port ${getServerPort(serverHandle)}.`);
  }

  const expressPort = getServerPort(serverHandle);
  const backendUrl = `http://127.0.0.1:${expressPort}`;

  if (!frontendProcess) {
    // Pick a fresh free port each launch so a stale/orphaned Next.js process
    // from a previous run can never cause an EADDRINUSE collision.
    frontendPort = await findFreePort();
    logDesktop(`Starting Next.js frontend on free port ${frontendPort}.`);
    frontendProcess = spawnFrontend(expressPort, frontendPort);
  }

  const frontendUrl = `http://127.0.0.1:${frontendPort}`;

  logDesktop(`Waiting for Next.js to be ready at ${frontendUrl}…`);
  const ready = await waitForPort(frontendPort);
  if (!ready) {
    throw new Error(`Next.js did not become ready on port ${frontendPort} in time.`);
  }
  logDesktop("Next.js ready.");

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1180,
    minHeight: 760,
    show: false,
    autoHideMenuBar: true,
    title: "Portal Visualizer",
    backgroundColor: "#07111F",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.on("closed", () => {
    logDesktop("Main window closed.");
    mainWindow = null;

    if (!isQuitting && process.platform !== "darwin") {
      logDesktop("No remaining windows. Quitting app.");
      app.quit();
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(frontendUrl) || url.startsWith(backendUrl)) {
      return { action: "allow" };
    }

    void shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (url.startsWith(frontendUrl) || url.startsWith(backendUrl)) {
      return;
    }

    event.preventDefault();
    void shell.openExternal(url);
  });

  logDesktop(`Loading ${frontendUrl}`);
  await mainWindow.loadURL(frontendUrl);
  logDesktop("Frontend loaded.");
}

function resolveFrontendDir() {
  if (!app.isPackaged) return path.join(projectRoot, "frontend");
  // exe lives at dist/win-unpacked/<name>.exe — go up two dirs to project root
  return path.join(path.dirname(app.getPath("exe")), "..", "..", "frontend");
}

function spawnFrontend(expressPort, port) {
  const subcommand = app.isPackaged ? "start" : "dev";
  const frontendDir = resolveFrontendDir();
  const nextBin = path.join(
    frontendDir,
    "node_modules",
    "next",
    "dist",
    "bin",
    "next"
  );
  logDesktop(`Frontend dir: ${frontendDir}`);
  logDesktop(`Next bin: ${nextBin}`);

  // Run the Next.js CLI directly with Electron's bundled Node runtime
  // (ELECTRON_RUN_AS_NODE makes the current executable behave as `node`).
  // Benefits over spawning `npm.cmd`:
  //   * no dependency on a system Node/npm install,
  //   * no shell wrapper — so child.kill() terminates the real process and we
  //     never orphan a Next.js server that would hold the port on relaunch.
  const child = spawn(
    process.execPath,
    [nextBin, subcommand, "-p", String(port)],
    {
      cwd: frontendDir,
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: "1",
        BACKEND_URL: `http://127.0.0.1:${expressPort}`,
      },
      stdio: ["ignore", "pipe", "pipe"],
    }
  );

  child.stdout.on("data", (chunk) => logDesktop(`[next] ${chunk.toString().trimEnd()}`));
  child.stderr.on("data", (chunk) => logDesktop(`[next:err] ${chunk.toString().trimEnd()}`));

  child.on("exit", (code, signal) => {
    logDesktop(`Next.js process exited (code=${code}, signal=${signal})`);
    frontendProcess = null;
    if (!isQuitting) {
      logDesktop("Unexpected Next.js exit — quitting app.");
      app.quit();
    }
  });

  return child;
}

function stopFrontend() {
  if (!frontendProcess) return;
  const child = frontendProcess;
  frontendProcess = null;
  logDesktop("Stopping Next.js process.");
  try {
    child.kill();
  } catch { /* ignore */ }
}

function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

async function waitForPort(port, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const open = await isPortOpen(port);
    if (open) return true;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

function isPortOpen(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(400);
    socket.once("connect", () => { socket.destroy(); resolve(true); });
    socket.once("error", () => { socket.destroy(); resolve(false); });
    socket.once("timeout", () => { socket.destroy(); resolve(false); });
    socket.connect(port, "127.0.0.1");
  });
}

function prepareDesktopEnvironment() {
  const userDataDirectory = app.getPath("userData");
  fs.mkdirSync(userDataDirectory, { recursive: true });
  desktopLogPath = path.join(userDataDirectory, "desktop-shell.log");
  fs.appendFileSync(
    desktopLogPath,
    `\n[${new Date().toISOString()}] --- Desktop launch ---\n`
  );

  const envPath = resolveEnvPath(userDataDirectory);

  if (envPath) {
    process.env.DOTENV_CONFIG_PATH = envPath;
    logDesktop(`Using env file: ${envPath}`);
  } else {
    logDesktop("No env file found. Desktop shell will use process defaults.");
  }

  process.chdir(userDataDirectory);
  logDesktop(`Changed working directory to ${userDataDirectory}.`);
}

function resolveEnvPath(userDataDirectory) {
  const executableDirectory = path.dirname(app.getPath("exe"));
  const candidatePaths = app.isPackaged
    ? [
        path.join(executableDirectory, ".env"),
        path.join(userDataDirectory, ".env"),
        path.resolve(executableDirectory, "..", "..", ".env"),
        path.join(initialWorkingDirectory, ".env")
      ]
    : [
        path.join(projectRoot, ".env"),
        path.join(initialWorkingDirectory, ".env")
      ];

  return candidatePaths.find((candidatePath) => fs.existsSync(candidatePath)) || "";
}

function getServerPort(handle) {
  const address = handle.server.address();
  return typeof address === "object" && address ? address.port : handle.config.port;
}

async function stopServer() {
  if (!serverHandle) {
    return;
  }

  const handle = serverHandle;
  serverHandle = null;

  logDesktop("Stopping embedded Express server.");
  await handle.dispose();
  await new Promise((resolve, reject) => {
    handle.server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

async function showFatalError(error) {
  const message = error?.message || String(error);

  console.error(error);
  logDesktop(`Showing fatal error dialog: ${message}`);

  await dialog.showMessageBox({
    type: "error",
    title: "Portal Visualizer",
    message: "The desktop app could not start.",
    detail: message
  });

  app.quit();
}

function logDesktop(message) {
  const timestampedMessage = `[${new Date().toISOString()}] ${message}\n`;

  try {
    if (desktopLogPath) {
      fs.appendFileSync(desktopLogPath, timestampedMessage);
    }
  } catch (error) {
    console.error("Desktop log write failed:", error);
  }

  console.log(message);
}

function appendBootstrapLog(message) {
  try {
    fs.appendFileSync(
      bootstrapLogPath,
      `[${new Date().toISOString()}] ${message}\n`
    );
  } catch (error) {
    console.error("Bootstrap log write failed:", error);
  }
}
