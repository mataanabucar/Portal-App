import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

const projectRoot = process.cwd();
const projectEnvPath = path.join(projectRoot, ".env");
const packagedExecutablePath = path.join(
  projectRoot,
  "dist",
  "win-unpacked",
  "Portal Visualizer.exe"
);
const localElectronBinaryPath = resolveLocalElectronBinaryPath();
const forceRebuild = process.argv.includes("--rebuild");
const watchedPaths = [
  path.join(projectRoot, "package.json"),
  path.join(projectRoot, "public"),
  path.join(projectRoot, "scripts"),
  path.join(projectRoot, "src"),
  path.join(projectRoot, ".env.example"),
  path.join(projectRoot, "README.md")
];

launchDesktopShell();

function launchDesktopShell() {
  const launchTarget = resolveLaunchTarget();
  syncPackagedEnvFile(launchTarget);

  if (process.platform === "win32") {
    launchWindowsTarget(launchTarget);
    return;
  }

  const childProcess = spawn(launchTarget.command, launchTarget.args, {
    cwd: launchTarget.cwd,
    detached: true,
    stdio: "ignore"
  });

  childProcess.unref();
}

function resolveLaunchTarget() {
  if (localElectronBinaryPath) {
    return {
      command: localElectronBinaryPath,
      args: [projectRoot],
      cwd: projectRoot,
      isPackagedShell: false
    };
  }

  ensurePackagedShell();

  if (fs.existsSync(packagedExecutablePath)) {
    return {
      command: packagedExecutablePath,
      args: [],
      cwd: path.dirname(packagedExecutablePath),
      isPackagedShell: true
    };
  }

  console.error(
    "No Electron shell runtime is available. Install dependencies with `npm install` or build the portable shell with `npm run pack:win`."
  );
  process.exit(1);
}

function resolveLocalElectronBinaryPath() {
  const executableName = process.platform === "win32" ? "electron.exe" : "electron";
  const candidatePath = path.join(
    projectRoot,
    "node_modules",
    "electron",
    "dist",
    executableName
  );

  return fs.existsSync(candidatePath) ? candidatePath : "";
}

function ensurePackagedShell() {
  if (!shouldBuildPackagedShell()) {
    return;
  }

  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  const buildResult = spawnSync(npmCommand, ["run", "pack:win"], {
    cwd: projectRoot,
    stdio: "inherit"
  });

  if (buildResult.status !== 0 || !fs.existsSync(packagedExecutablePath)) {
    process.exit(buildResult.status ?? 1);
  }
}

function shouldBuildPackagedShell() {
  if (!fs.existsSync(packagedExecutablePath)) {
    return true;
  }

  if (forceRebuild) {
    return true;
  }

  const packagedMtime = fs.statSync(packagedExecutablePath).mtimeMs;
  return getLatestSourceMtime() > packagedMtime;
}

function getLatestSourceMtime() {
  return watchedPaths.reduce((latestMtime, entryPath) => {
    return Math.max(latestMtime, getEntryMtime(entryPath));
  }, 0);
}

function getEntryMtime(entryPath) {
  if (!fs.existsSync(entryPath)) {
    return 0;
  }

  const entryStats = fs.statSync(entryPath);

  if (!entryStats.isDirectory()) {
    return entryStats.mtimeMs;
  }

  return fs.readdirSync(entryPath).reduce((latestMtime, childName) => {
    return Math.max(
      latestMtime,
      getEntryMtime(path.join(entryPath, childName))
    );
  }, entryStats.mtimeMs);
}

function syncPackagedEnvFile(launchTarget) {
  if (!launchTarget.isPackagedShell || !fs.existsSync(projectEnvPath)) {
    return;
  }

  const packagedEnvPath = path.join(launchTarget.cwd, ".env");

  try {
    const shouldCopy =
      !fs.existsSync(packagedEnvPath) ||
      fs.statSync(projectEnvPath).mtimeMs > fs.statSync(packagedEnvPath).mtimeMs;

    if (shouldCopy) {
      fs.copyFileSync(projectEnvPath, packagedEnvPath);
    }
  } catch (error) {
    console.warn(`Could not sync .env to the packaged shell: ${error.message}`);
  }
}

function launchWindowsTarget(launchTarget) {
  const filePath = toSingleQuotedPowerShell(launchTarget.command);
  const workingDirectory = toSingleQuotedPowerShell(launchTarget.cwd);
  const argumentList =
    launchTarget.args.length > 0
      ? ` -ArgumentList ${launchTarget.args
          .map((argument) => toSingleQuotedPowerShell(argument))
          .join(", ")}`
      : "";

  const startCommand =
    `Start-Process -FilePath ${filePath}` +
    ` -WorkingDirectory ${workingDirectory}` +
    argumentList;

  const result = spawnSync(
    "powershell.exe",
    ["-NoProfile", "-Command", startCommand],
    {
      cwd: launchTarget.cwd,
      stdio: "ignore"
    }
  );

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function toSingleQuotedPowerShell(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}
