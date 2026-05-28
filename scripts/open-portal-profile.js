import "dotenv/config";
import { spawn } from "node:child_process";
import path from "node:path";
import {
  detectBrowserExecutablePath
} from "../src/server/services/portal/browserExecutable.js";
import { prepareBrowserProfile } from "../src/server/services/portal/browserProfile.js";

const executablePath = detectBrowserExecutablePath(
  process.env.PLAYWRIGHT_EXECUTABLE_PATH ||
    "C:\\Users\\700000347\\AppData\\Local\\Google\\Chrome Beta\\Application\\chrome.exe"
);

if (!executablePath) {
  console.error("No supported browser executable was found.");
  process.exit(1);
}

const profilePaths = prepareBrowserProfile({
  playwrightExecutablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || "",
  playwrightUserDataDir:
    process.env.PLAYWRIGHT_USER_DATA_DIR || ".local-browser/portal-profile"
});
const portalUrl =
  process.env.PORTAL_TARGET_URL ||
  "https://tools.benchmarkdigital.com/gsportal/index_old.cfm";

spawn(
  executablePath,
  [`--user-data-dir=${profilePaths.launchUserDataDir}`, portalUrl],
  {
    detached: true,
    stdio: "ignore",
    cwd: path.dirname(executablePath)
  }
).unref();

console.log(`Opened browser profile at: ${profilePaths.launchUserDataDir}`);

if (profilePaths.sourceUserDataDir) {
  console.log(`Mirrored from source profile: ${profilePaths.sourceUserDataDir}`);
}
