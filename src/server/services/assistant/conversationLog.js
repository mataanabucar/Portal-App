import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const assistantConversationLogDir = fileURLToPath(
  new URL("../../../../.local-state/assistant-chat-history/", import.meta.url)
);
const assistantConversationLogFile = join(
  assistantConversationLogDir,
  "conversation-log.jsonl"
);

export function appendAssistantConversationLog(entry) {
  try {
    mkdirSync(assistantConversationLogDir, { recursive: true });
    appendFileSync(
      assistantConversationLogFile,
      `${JSON.stringify({
        loggedAt: new Date().toISOString(),
        ...entry,
      })}\n`,
      "utf8"
    );
  } catch (error) {
    console.warn("[assistant-chat-log] append failed:", error.message);
  }
}

export function getAssistantConversationLogDir() {
  return assistantConversationLogDir;
}
