// Shared Graph catalog runner used by both the legacy assistant tool loop
// (controller.js) and the deterministic orchestrator's graph provider.
// Keeps catalog validation, the mutation → proposeAction gate, and audit
// logging in one place. Extracted verbatim from controller.js.

import { fileURLToPath } from "node:url";
import { mkdirSync, appendFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  getCatalogEntry,
  isCatalogEntryEnabled,
} from "../../../graph-tester/catalog/graphTesterCatalog.js";
import { parseCatalogArgs } from "../../../graph-tester/utils/fieldParsers.js";
import { buildActionSummary } from "./pendingActions.js";

// Append-only audit log for assistant tool calls / proposed actions. Separate
// from EMAIL_SEND_LOG_FILE (app.js) so existing email logging is untouched.
// Records service/functionName/status only — never tokens, and never the
// argument values (recipients/subject/body/etc. already live in the
// human-readable summary shown to the user at confirm time, not duplicated
// here at rest).
const ACTION_LOG_FILE = fileURLToPath(
  new URL("../../../../.local-state/assistant-action-log.jsonl", import.meta.url)
);

export function logAssistantAction(entry) {
  try {
    mkdirSync(dirname(ACTION_LOG_FILE), { recursive: true });
    appendFileSync(
      ACTION_LOG_FILE,
      `${JSON.stringify({ timestamp: new Date().toISOString(), ...entry })}\n`,
      "utf8"
    );
  } catch (error) {
    console.error("[assistant] failed to append audit log:", error.message);
  }
}

export async function runGraphFunction(rawArgs, { token, grantedScopes, pendingActionStore }) {
  const service = typeof rawArgs?.service === "string" ? rawArgs.service.trim() : "";
  const functionName = typeof rawArgs?.functionName === "string" ? rawArgs.functionName.trim() : "";
  const functionArgs = rawArgs?.args && typeof rawArgs.args === "object" ? rawArgs.args : {};

  if (!service || !functionName) {
    return { error: "service and functionName are required. Call list_graph_functions first if unsure." };
  }

  // Defense in depth: re-verify against the live catalog even though the
  // model was only ever shown functions list_graph_functions already
  // filtered by the current token's granted scopes.
  const entry = getCatalogEntry(service, functionName);
  if (!entry || entry.hidden) {
    logAssistantAction({ status: "rejected", service, functionName, reason: "unknown catalog entry" });
    return { error: `Unknown Graph function ${service}.${functionName}. Use list_graph_functions to discover valid names.` };
  }
  if (!isCatalogEntryEnabled(entry, grantedScopes)) {
    logAssistantAction({ status: "rejected", service, functionName, reason: "missing scope" });
    return { error: `The signed-in account does not have the scopes needed for ${service}.${functionName}.` };
  }

  let normalizedArgs;
  try {
    normalizedArgs = parseCatalogArgs(entry, functionArgs);
  } catch (validationError) {
    logAssistantAction({ status: "rejected", service, functionName, reason: "invalid arguments" });
    return { error: validationError.message || "Invalid arguments." };
  }

  if (entry.mutation) {
    const summary = buildActionSummary(service, functionName, normalizedArgs, entry.label);
    const proposed = pendingActionStore.proposeAction({ service, functionName, args: normalizedArgs, summary });
    logAssistantAction({ status: "proposed", id: proposed.id, service, functionName });
    return {
      proposedAction: {
        id: proposed.id,
        service: proposed.service,
        functionName: proposed.functionName,
        label: entry.label,
        summary: proposed.summary,
        status: proposed.status,
      },
    };
  }

  try {
    const data = await entry.invoke(token, normalizedArgs);
    return { result: data };
  } catch (graphError) {
    return { error: graphError?.graphMessage || graphError?.message || "Graph request failed." };
  }
}
