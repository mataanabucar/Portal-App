import fs from "node:fs";
import path from "node:path";
import {
  detectBrowserUserDataDir,
  resolveBrowserUserDataDir
} from "./browserExecutable.js";

const MIRRORED_PROFILE_DIR = path.resolve(
  process.cwd(),
  ".local-browser/chrome-beta-user-data-mirror"
);

const ROOT_ENTRIES_TO_COPY = ["Default", "Local State", "Last Version"];
const EXCLUDED_NAMES = new Set([
  "Cache",
  "Code Cache",
  "Crashpad",
  "DevToolsActivePort",
  "DawnCache",
  "GPUCache",
  "GrShaderCache",
  "ShaderCache",
  "SingletonCookie",
  "SingletonLock",
  "SingletonSocket"
]);

export function resolveBrowserProfilePaths(config) {
  const configuredUserDataDir = resolveBrowserUserDataDir(
    config.playwrightUserDataDir
  );
  const defaultUserDataDir = detectBrowserUserDataDir(
    config.playwrightExecutablePath
  );
  const mirrorsDefaultProfile =
    Boolean(defaultUserDataDir) &&
    normalizePath(configuredUserDataDir) === normalizePath(defaultUserDataDir);

  return {
    configuredUserDataDir,
    launchUserDataDir: mirrorsDefaultProfile
      ? MIRRORED_PROFILE_DIR
      : configuredUserDataDir,
    sourceUserDataDir: mirrorsDefaultProfile ? configuredUserDataDir : null,
    mirrorsDefaultProfile
  };
}

export function prepareBrowserProfile(config) {
  const profilePaths = resolveBrowserProfilePaths(config);

  if (!profilePaths.mirrorsDefaultProfile) {
    fs.mkdirSync(profilePaths.launchUserDataDir, { recursive: true });
    return profilePaths;
  }

  syncProfileMirror(
    profilePaths.sourceUserDataDir,
    profilePaths.launchUserDataDir
  );

  return profilePaths;
}

function syncProfileMirror(sourceDir, targetDir) {
  if (!fs.existsSync(sourceDir)) {
    throw new Error(`Chrome Beta profile source was not found: ${sourceDir}`);
  }

  fs.mkdirSync(targetDir, { recursive: true });

  for (const entryName of ROOT_ENTRIES_TO_COPY) {
    const sourcePath = path.join(sourceDir, entryName);

    if (!fs.existsSync(sourcePath)) {
      continue;
    }

    const targetPath = path.join(targetDir, entryName);
    copyProfileEntry(sourcePath, targetPath);
  }
}

function shouldCopyProfilePath(sourcePath) {
  return !EXCLUDED_NAMES.has(path.basename(sourcePath));
}

function copyProfileEntry(sourcePath, targetPath) {
  if (!shouldCopyProfilePath(sourcePath)) {
    return;
  }

  let stats;

  try {
    stats = fs.statSync(sourcePath);
  } catch (error) {
    if (isSkippableProfileCopyError(error)) {
      return;
    }

    throw error;
  }

  if (stats.isDirectory()) {
    fs.mkdirSync(targetPath, { recursive: true });

    for (const entryName of fs.readdirSync(sourcePath)) {
      copyProfileEntry(
        path.join(sourcePath, entryName),
        path.join(targetPath, entryName)
      );
    }

    return;
  }

  try {
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.copyFileSync(sourcePath, targetPath);
  } catch (error) {
    if (isSkippableProfileCopyError(error)) {
      return;
    }

    throw error;
  }
}

function isSkippableProfileCopyError(error) {
  return ["EBUSY", "ENOENT", "EPERM", "UNKNOWN"].includes(error?.code);
}

function normalizePath(targetPath) {
  return path.resolve(targetPath).replace(/\//g, "\\").toLowerCase();
}
