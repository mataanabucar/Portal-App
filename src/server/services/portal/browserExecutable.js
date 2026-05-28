import fs from "node:fs";
import path from "node:path";

export function detectBrowserExecutablePath(explicitPath = "") {
  if (explicitPath) {
    const resolvedPath = path.resolve(explicitPath);
    return fs.existsSync(resolvedPath) ? resolvedPath : null;
  }

  const candidatePaths = buildCandidatePaths();
  return candidatePaths.find((candidatePath) => fs.existsSync(candidatePath)) || null;
}

export function resolveBrowserUserDataDir(rawPath = "") {
  const inputPath = rawPath || ".local-browser/portal-profile";
  return path.isAbsolute(inputPath)
    ? inputPath
    : path.resolve(process.cwd(), inputPath);
}

export function detectBrowserUserDataDir(explicitExecutablePath = "") {
  const executablePath = detectBrowserExecutablePath(explicitExecutablePath) || "";
  const localAppData = process.env.LOCALAPPDATA || "";

  if (!localAppData) {
    return null;
  }

  if (executablePath.includes("Chrome Beta")) {
    return path.join(localAppData, "Google", "Chrome Beta", "User Data");
  }

  if (executablePath.includes("Chrome\\Application")) {
    return path.join(localAppData, "Google", "Chrome", "User Data");
  }

  if (executablePath.includes("Edge Beta")) {
    return path.join(localAppData, "Microsoft", "Edge Beta", "User Data");
  }

  if (executablePath.includes("Edge\\Application")) {
    return path.join(localAppData, "Microsoft", "Edge", "User Data");
  }

  return null;
}

export function resolveDevToolsActivePortFile(
  rawPath = "",
  explicitExecutablePath = ""
) {
  if (rawPath) {
    return path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), rawPath);
  }

  const userDataDir = detectBrowserUserDataDir(explicitExecutablePath);
  return userDataDir ? path.join(userDataDir, "DevToolsActivePort") : null;
}

export function resolveBrowserCdpEndpoint({
  explicitEndpoint = "",
  activePortFile = "",
  explicitExecutablePath = ""
}) {
  if (explicitEndpoint) {
    return explicitEndpoint;
  }

  const resolvedActivePortFile = resolveDevToolsActivePortFile(
    activePortFile,
    explicitExecutablePath
  );

  if (!resolvedActivePortFile || !fs.existsSync(resolvedActivePortFile)) {
    return null;
  }

  const [port, websocketPath] = fs
    .readFileSync(resolvedActivePortFile, "utf8")
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean);

  if (port && websocketPath?.startsWith("/devtools/browser/")) {
    return `ws://127.0.0.1:${port}${websocketPath}`;
  }

  return port ? `http://127.0.0.1:${port}` : null;
}

function buildCandidatePaths() {
  const paths = [];
  const localAppData = process.env.LOCALAPPDATA || "";
  const programFiles = process.env.PROGRAMFILES || "";
  const programFilesX86 = process.env["PROGRAMFILES(X86)"] || "";

  addPath(paths, localAppData, "Google", "Chrome Beta", "Application", "chrome.exe");
  addPath(paths, programFiles, "Google", "Chrome Beta", "Application", "chrome.exe");
  addPath(paths, programFilesX86, "Google", "Chrome Beta", "Application", "chrome.exe");
  addPath(paths, localAppData, "Google", "Chrome", "Application", "chrome.exe");
  addPath(paths, programFiles, "Google", "Chrome", "Application", "chrome.exe");
  addPath(paths, programFilesX86, "Google", "Chrome", "Application", "chrome.exe");
  addPath(paths, localAppData, "Microsoft", "Edge Beta", "Application", "msedge.exe");
  addPath(paths, programFiles, "Microsoft", "Edge Beta", "Application", "msedge.exe");
  addPath(paths, programFilesX86, "Microsoft", "Edge Beta", "Application", "msedge.exe");
  addPath(paths, localAppData, "Microsoft", "Edge", "Application", "msedge.exe");
  addPath(paths, programFiles, "Microsoft", "Edge", "Application", "msedge.exe");
  addPath(paths, programFilesX86, "Microsoft", "Edge", "Application", "msedge.exe");

  return paths;
}

function addPath(paths, basePath, ...segments) {
  if (!basePath) {
    return;
  }

  paths.push(path.join(basePath, ...segments));
}
