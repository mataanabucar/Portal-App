import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const projectRoot = process.cwd();
const distRoot = path.join(projectRoot, "dist");
const shareableRoot = path.join(distRoot, "shareable");
const bundleName = "Portal Visualizer Shareable";
const bundleRoot = path.join(shareableRoot, bundleName);
const zipPath = path.join(shareableRoot, `${bundleName}.zip`);
const packagedShellRoot = path.join(distRoot, "win-unpacked");
const packagedExecutablePath = path.join(
  packagedShellRoot,
  "Portal Visualizer.exe"
);
const frontendRoot = path.join(projectRoot, "frontend");
const sourceEnvPath = path.join(projectRoot, ".env");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

main();

function main() {
  assertRequiredPath(frontendRoot, "Frontend directory was not found.");
  assertRequiredPath(sourceEnvPath, "Root .env file was not found.");

  stopRunningPackagedShell();
  runCommand(npmCommand, ["--prefix", "frontend", "run", "build"], projectRoot);
  runCommand(npmCommand, ["run", "pack:win"], projectRoot);

  assertRequiredPath(
    packagedExecutablePath,
    "Packaged Windows executable was not produced."
  );

  fs.rmSync(bundleRoot, { recursive: true, force: true });
  fs.rmSync(zipPath, { force: true });
  fs.mkdirSync(bundleRoot, { recursive: true });

  stageRootEnvFile();
  stagePackagedShell();
  stageFrontendRuntime();
  stageLauncher();
  stageReadme();
  compressBundle();

  console.log(`Shareable bundle created: ${zipPath}`);
}

function stopRunningPackagedShell() {
  if (process.platform !== "win32") {
    return;
  }

  const distShellPrefix = pathToPowerShellLiteral(
    packagedShellRoot.toLowerCase()
  );

  const command = [
    "$ErrorActionPreference = 'Stop'",
    "$targets = Get-Process 'Portal Visualizer' -ErrorAction SilentlyContinue |",
    `  Where-Object { $_.Path -and $_.Path.ToLower().StartsWith(${distShellPrefix}) }`,
    "if ($targets) {",
    "  $targets | Stop-Process -Force",
    "  Start-Sleep -Milliseconds 1500",
    "}",
    "exit 0",
  ].join("\n");

  runCommand("powershell.exe", ["-NoProfile", "-Command", command], projectRoot);
}

function stageRootEnvFile() {
  fs.copyFileSync(sourceEnvPath, path.join(bundleRoot, ".env"));
}

function stagePackagedShell() {
  const destination = path.join(bundleRoot, "dist", "win-unpacked");
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.cpSync(packagedShellRoot, destination, {
    recursive: true,
    force: true,
  });
}

function stageFrontendRuntime() {
  const destinationRoot = path.join(bundleRoot, "frontend");
  fs.mkdirSync(destinationRoot, { recursive: true });

  for (const entryName of [
    ".next",
    "node_modules",
    "public",
    "package.json",
    "package-lock.json",
    "next.config.ts",
    "next-env.d.ts",
  ]) {
    const sourcePath = path.join(frontendRoot, entryName);
    const destinationPath = path.join(destinationRoot, entryName);

    assertRequiredPath(
      sourcePath,
      `Required frontend runtime entry is missing: frontend\\${entryName}`
    );

    copyEntry(sourcePath, destinationPath);
  }
}

function stageLauncher() {
  const launcherPath = path.join(bundleRoot, "Launch Portal Visualizer.cmd");
  const launcherContents = [
    "@echo off",
    "setlocal",
    'cd /d "%~dp0"',
    'if not exist "dist\\win-unpacked\\Portal Visualizer.exe" (',
    "  echo.",
    '  echo Missing dist\\win-unpacked\\Portal Visualizer.exe',
    "  pause",
    "  exit /b 1",
    ")",
    'start "" "dist\\win-unpacked\\Portal Visualizer.exe"',
    "exit /b 0",
    "",
  ].join("\r\n");

  fs.writeFileSync(launcherPath, launcherContents, "utf8");
}

function stageReadme() {
  const readmePath = path.join(bundleRoot, "START HERE.txt");
  const contents = [
    "Portal Visualizer Shareable Bundle",
    "",
    "How to use",
    "1. Unzip this folder somewhere local.",
    "2. Double-click Launch Portal Visualizer.cmd.",
    "3. Sign in to Microsoft / Portal in the browser window when prompted.",
    "",
    "Included",
    "- dist\\win-unpacked\\Portal Visualizer.exe",
    "- frontend runtime required by the packaged shell",
    "- .env at the bundle root",
    "",
    "Notes",
    "- Do not move the EXE out of dist\\win-unpacked. It expects the bundled frontend folder to stay two levels up.",
    "- Do not copy another user's .local-auth or browser profile data into this bundle.",
    "- Email / Teams Graph-backed features still depend on that user completing their own Graph sign-in flow on their machine if those features are needed.",
    "",
  ].join("\r\n");

  fs.writeFileSync(readmePath, contents, "utf8");
}

function compressBundle() {
  if (process.platform !== "win32") {
    throw new Error("The shareable zip builder currently targets Windows only.");
  }

  // tar.exe (Windows built-in since 10 1803) with -a auto-selects zip from .zip extension.
  // Significantly faster than PowerShell Compress-Archive for large folders.
  runCommand("tar.exe", ["-a", "-c", "-f", zipPath, "-C", shareableRoot, bundleName], projectRoot);
}

function copyEntry(sourcePath, destinationPath) {
  const stats = fs.statSync(sourcePath);

  if (stats.isDirectory()) {
    fs.cpSync(sourcePath, destinationPath, {
      recursive: true,
      force: true,
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
    stdio: "inherit",
  });

  if (result.error) {
    console.error(
      `Failed to launch ${command}: ${result.error.message || result.error}`
    );
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function pathToPowerShellLiteral(targetPath) {
  return `'${String(targetPath).replaceAll("'", "''")}'`;
}
