/**
 * Graph capability report.
 *
 * Reads filesforcontext/*.json (app-registration manifest + decoded token
 * text file), plus the runtime token cache when present, and reports which
 * Graph tester functions the delegated scopes enable.
 *
 * Usage: npm run graph:capabilities
 * Output: filesforcontext/graph-capability-report.generated.json
 *
 * Never prints or persists token material — claims metadata only.
 */

import fs from "node:fs/promises";
import path from "node:path";
import {
  buildCapabilityReport,
  getClaimsFromRawJwtOrDecodedFile,
  parseDecodedTokenFile,
} from "../src/server/services/graph/graphCapabilities.js";
import { getFlatCatalog } from "../src/graph-tester/catalog/graphTesterCatalog.js";

const ROOT_DIR = path.resolve(process.cwd());
const CONTEXT_DIR = path.join(ROOT_DIR, "filesforcontext");
const OUTPUT_FILE = path.join(CONTEXT_DIR, "graph-capability-report.generated.json");
const TOKEN_CACHE_FILE = path.join(
  ROOT_DIR,
  process.env.GRAPH_TOKEN_CACHE_FILE || ".local-auth/graph-tester-token.json"
);

async function main() {
  const { manifest, decodedTokenClaims } = await readContextFiles();
  const currentTokenClaims = await readRuntimeTokenClaims();

  const report = buildCapabilityReport({
    manifest,
    decodedTokenClaims,
    currentTokenClaims,
    catalog: getFlatCatalog(),
  });

  await fs.writeFile(OUTPUT_FILE, JSON.stringify(report, null, 2), "utf-8");

  printSummary(report);
  console.log(`\nFull report: ${path.relative(ROOT_DIR, OUTPUT_FILE)}`);
}

async function readContextFiles() {
  let manifest = null;
  let decodedTokenClaims = null;

  let fileNames = [];
  try {
    fileNames = await fs.readdir(CONTEXT_DIR);
  } catch {
    console.warn(`filesforcontext/ not found at ${CONTEXT_DIR}`);
    return { manifest, decodedTokenClaims };
  }

  for (const fileName of fileNames) {
    if (!fileName.endsWith(".json") || fileName.includes("generated")) continue;
    const rawText = await fs.readFile(path.join(CONTEXT_DIR, fileName), "utf-8");

    // Clean JSON with appId + displayName → the app-registration manifest.
    try {
      const parsed = JSON.parse(rawText);
      if (parsed && typeof parsed.appId === "string" && parsed.displayName) {
        manifest = parsed;
        continue;
      }
    } catch {
      // Not clean JSON — likely the decoded token file; handled below.
    }

    // Decoded token file: {header}.{payload}.[Signature] — parse defensively.
    if (!decodedTokenClaims) {
      const { claims } = parseDecodedTokenFile(rawText);
      if (claims && (claims.scp || claims.appid || claims.aud)) {
        decodedTokenClaims = claims;
      }
    }
  }

  return { manifest, decodedTokenClaims };
}

// Runtime token cache written by the graph-tester login flow. Only decoded
// claims are used; the token string never leaves this function.
async function readRuntimeTokenClaims() {
  try {
    const parsed = JSON.parse(await fs.readFile(TOKEN_CACHE_FILE, "utf-8"));
    if (typeof parsed?.accessToken !== "string") return null;
    return getClaimsFromRawJwtOrDecodedFile(parsed.accessToken);
  } catch {
    return null;
  }
}

function printSummary(report) {
  const lines = [
    "Graph capability report",
    "=======================",
    `Manifest app:        ${report.manifest.displayName || "(not found)"} (${report.manifest.appId || "-"})`,
    `Token source:        ${report.tokenSource}`,
    `Token app:           ${report.token.appDisplayName || "-"} (${report.token.appId || "-"})`,
    `Token type:          ${report.token.tokenType || "-"}`,
    `Token user:          ${report.token.upn || "-"}`,
    `Token expires:       ${report.token.expiresAt || "-"}`,
    `Identity match:      ${report.identityMatch ? "YES — token was issued to the portal app" : "NO"}`,
    "",
    `Delegated scopes (${report.grantedDelegatedScopes.length}): ${report.grantedDelegatedScopes.join(" ") || "-"}`,
    `Ignored internal scopes (${report.ignoredScopes.length}): ${report.ignoredScopes.join(" ") || "-"}`,
    `App roles (${report.grantedRoles.length}): ${report.grantedRoles.join(" ") || "-"}`,
    "",
    `Enabled functions:   ${report.counts.enabled}`,
    `Disabled functions:  ${report.counts.disabled}`,
  ];

  for (const warning of report.warnings) {
    lines.push("", `WARNING: ${warning}`);
  }

  console.log(lines.join("\n"));
}

main().catch((error) => {
  console.error(`graph-capability-report failed: ${error.message}`);
  process.exitCode = 1;
});
