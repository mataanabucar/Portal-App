import { app, BrowserWindow, dialog, shell } from "electron";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
    logDesktop("Starting embedded server.");
    serverHandle = startServer({
      host: "127.0.0.1",
      port: 0,
      playwrightUserDataDir: path.join(
        app.getPath("userData"),
        "browser-profile"
      )
    });
    await serverHandle.ready;
    logDesktop(`Embedded server ready on port ${getServerPort(serverHandle)}.`);
  }

  const port = getServerPort(serverHandle);
  const appOrigin = `http://127.0.0.1:${port}`;

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
    if (url.startsWith(appOrigin)) {
      return { action: "allow" };
    }

    void shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (url.startsWith(appOrigin)) {
      return;
    }

    event.preventDefault();
    void shell.openExternal(url);
  });

  logDesktop(`Loading desktop origin ${appOrigin}.`);
  await mainWindow.loadURL(appOrigin);
  logDesktop("Desktop origin loaded.");
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

  logDesktop("Stopping embedded server.");
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
