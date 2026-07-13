import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const projectRoot = process.cwd();
const clientRoot = path.join(projectRoot, "src", "graph-tester", "client");
const packageJsonPath = path.join(clientRoot, "package.json");
const packageLockPath = path.join(clientRoot, "package-lock.json");
const nodeModulesPath = path.join(clientRoot, "node_modules");
const viteBinaryPath = path.join(
  nodeModulesPath,
  ".bin",
  process.platform === "win32" ? "vite.cmd" : "vite"
);
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

main();

function main() {
  assertRequiredPath(packageJsonPath, `Graph tester client package not found: ${packageJsonPath}`);

  if (fs.existsSync(viteBinaryPath)) {
    return;
  }

  const installMode = fs.existsSync(packageLockPath) ? "ci" : "install";

  console.log("[setup] Graph tester client dependencies missing. Installing now...");
  runCommand(npmCommand, [installMode], clientRoot);

  assertRequiredPath(
    viteBinaryPath,
    "Graph tester client install finished, but the local Vite binary is still missing."
  );
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
