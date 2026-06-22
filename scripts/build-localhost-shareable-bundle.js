import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const projectRoot = process.cwd();
const distRoot = path.join(projectRoot, "dist");
const shareableRoot = path.join(distRoot, "localhost-shareable");
const bundleName = "Portal Visualizer Localhost Standalone";
const bundleRoot = path.join(shareableRoot, bundleName);
const zipPath = path.join(shareableRoot, `${bundleName}.zip`);
const sourceEnvPath = path.join(projectRoot, ".env");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

main();

function main() {
  assertRequiredPath(sourceEnvPath, "Root .env file was not found.");

  runCommand(npmCommand, ["--prefix", "frontend", "run", "build"], projectRoot);

  fs.rmSync(bundleRoot, { recursive: true, force: true });
  fs.rmSync(zipPath, { force: true });
  fs.mkdirSync(bundleRoot, { recursive: true });

  stageRootRuntime();
  stageFrontendRuntime();
  installProductionDependencies();
  stageLauncher();
  stageReadme();
  compressBundle();

  console.log(`Localhost shareable bundle created: ${zipPath}`);
}

function stageRootRuntime() {
  copyEntry(sourceEnvPath, path.join(bundleRoot, ".env"));
  copyEntry(path.join(projectRoot, "package.json"), path.join(bundleRoot, "package.json"));
  copyEntry(
    path.join(projectRoot, "package-lock.json"),
    path.join(bundleRoot, "package-lock.json")
  );
  copyEntry(path.join(projectRoot, "src"), path.join(bundleRoot, "src"));
  copyEntry(path.join(projectRoot, "public"), path.join(bundleRoot, "public"));
  copyEntry(
    path.join(projectRoot, "scripts", "launch-localhost-prod.js"),
    path.join(bundleRoot, "scripts", "launch-localhost-prod.js")
  );
  copyEntry(
    path.join(projectRoot, "scripts", "launch-graph-tester.js"),
    path.join(bundleRoot, "scripts", "launch-graph-tester.js")
  );
}

function stageFrontendRuntime() {
  const frontendSource = path.join(projectRoot, "frontend");
  const frontendDestination = path.join(bundleRoot, "frontend");

  fs.mkdirSync(frontendDestination, { recursive: true });

  copyEntry(
    path.join(frontendSource, ".next", "standalone"),
    frontendDestination
  );
  copyEntry(
    path.join(frontendSource, ".next", "static"),
    path.join(frontendDestination, ".next", "static")
  );
  copyEntry(
    path.join(frontendSource, "public"),
    path.join(frontendDestination, "public")
  );
}

function installProductionDependencies() {
  runCommand(npmCommand, ["ci", "--omit=dev"], bundleRoot);
}

function stageLauncher() {
  const launcherPath = path.join(bundleRoot, "Launch Portal Visualizer Localhost.cmd");
  const launcherContents = [
    "@echo off",
    "setlocal",
    'cd /d "%~dp0"',
    "where node >nul 2>nul",
    "if errorlevel 1 (",
    "  echo.",
    "  echo Node.js is required to run this localhost bundle.",
    "  echo Install Node.js 20+ and run this launcher again.",
    "  pause",
    "  exit /b 1",
    ")",
    'if not exist ".env" (',
    "  echo.",
    '  echo Missing .env file next to this launcher.',
    "  pause",
    "  exit /b 1",
    ")",
    'node scripts\\launch-localhost-prod.js',
    "exit /b %errorlevel%",
    ""
  ].join("\r\n");

  fs.writeFileSync(launcherPath, launcherContents, "utf8");

  const graphLauncherPath = path.join(bundleRoot, "Launch Graph Tester.cmd");
  const graphLauncherContents = [
    "@echo off",
    "setlocal",
    'cd /d "%~dp0"',
    "where node >nul 2>nul",
    "if errorlevel 1 (",
    "  echo.",
    "  echo Node.js is required to run the Graph tester.",
    "  echo Install Node.js 20+ and run this launcher again.",
    "  pause",
    "  exit /b 1",
    ")",
    'if not exist ".env" (',
    "  echo.",
    '  echo Missing .env file next to this launcher.',
    "  pause",
    "  exit /b 1",
    ")",
    'node scripts\\launch-graph-tester.js',
    "exit /b %errorlevel%",
    ""
  ].join("\r\n");

  fs.writeFileSync(graphLauncherPath, graphLauncherContents, "utf8");
}

function stageReadme() {
  const readmePath = path.join(bundleRoot, "START HERE.txt");
  const contents = [
    "Portal Visualizer Localhost Bundle",
    "",
    "What this is",
    "- A smaller browser-based distribution that runs the app on localhost instead of Electron.",
    "",
    "Requirements",
    "- Node.js 20 or newer must already be installed on this machine.",
    "",
    "How to use",
    "1. Unzip this folder somewhere local.",
    "2. Double-click Launch Portal Visualizer Localhost.cmd.",
    "3. Wait for the launcher to start the backend and frontend.",
    "4. The browser will open automatically when the app is ready.",
    "5. Sign in to Microsoft / Portal when prompted.",
    "",
    "Graph email enrichment login",
    "- If the main app says Graph email enrichment was skipped, run Launch Graph Tester.cmd once.",
    "- Sign in through the Graph tester browser window.",
    "- After that, reopen or refresh the main app.",
    "",
    "Default local behavior",
    "- Backend starts on 127.0.0.1 beginning at port 3000.",
    "- Frontend starts on 127.0.0.1 beginning at port 3011.",
    "- If either port is busy, the launcher will choose the next open port.",
    "",
    "Included",
    "- Root backend runtime files",
    "- Built frontend output",
    "- Production-only node_modules",
    "- Graph tester runtime and launcher",
    "- .env at the bundle root",
    "",
    "Notes",
    "- This bundle is smaller than Electron because it does not include Chromium.",
    "- Do not copy another user's .local-auth, .local-browser, or .local-state folders into this bundle.",
    "- Local auth and cache files will be created on the target machine as the app runs.",
    ""
  ].join("\r\n");

  fs.writeFileSync(readmePath, contents, "utf8");
}

function compressBundle() {
  if (process.platform !== "win32") {
    throw new Error("The localhost shareable zip builder currently targets Windows only.");
  }

  runCommand(
    "tar.exe",
    ["-a", "-c", "-f", zipPath, "-C", shareableRoot, bundleName],
    projectRoot
  );
}

function copyEntry(sourcePath, destinationPath) {
  assertRequiredPath(sourcePath, `Missing required path: ${sourcePath}`);

  const stats = fs.statSync(sourcePath);

  if (stats.isDirectory()) {
    fs.cpSync(sourcePath, destinationPath, {
      recursive: true,
      force: true
    });
    return;
  }

  fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
  fs.copyFileSync(sourcePath, destinationPath);
}

function assertRequiredPath(targetPath, message) {
  if (!fs.existsSync(targetPath)) {
    throw new Error(message);
  }
}

function runCommand(command, args, cwd) {
  const useCmdWrapper =
    process.platform === "win32" && command.toLowerCase().endsWith(".cmd");
  const invocationCommand = useCmdWrapper
    ? process.env.ComSpec || "cmd.exe"
    : command;
  const invocationArgs = useCmdWrapper
    ? ["/d", "/s", "/c", command, ...args]
    : args;

  const result = spawnSync(invocationCommand, invocationArgs, {
    cwd,
    stdio: "inherit"
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
