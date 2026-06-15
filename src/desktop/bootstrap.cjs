// CommonJS bootstrap shim.
//
// Electron v42 reliably loads a CommonJS entry point. Loading an ESM file
// directly as "main" can fail silently in a packaged app (the `electron`
// module's named exports are not exposed to the ESM loader the same way).
// So we use this tiny CJS shim as the entry point and dynamically import the
// real ESM main module from here.
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");

const bootstrapLogPath = path.join(
  os.tmpdir(),
  "portal-visualizer-shell-bootstrap.log"
);

function log(message) {
  try {
    fs.appendFileSync(
      bootstrapLogPath,
      `[${new Date().toISOString()}] [shim] ${message}\n`
    );
  } catch {
    /* ignore */
  }
}

log(`CJS bootstrap shim loaded from ${__filename}`);

const mainUrl = require("node:url").pathToFileURL(
  path.join(__dirname, "main.js")
).href;

import(mainUrl).catch((error) => {
  log(`Failed to import ESM main: ${error?.stack || error}`);
  // Surface the error so it isn't swallowed.
  console.error("Failed to import ESM main:", error);
  try {
    const { app, dialog } = require("electron");
    app.whenReady().then(() => {
      dialog.showErrorBox(
        "Portal Visualizer",
        `The desktop app could not start.\n\n${error?.message || error}`
      );
      app.quit();
    });
  } catch {
    process.exit(1);
  }
});
