"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  assistantChat,
  type AssistantCapability,
  type AssistantChatEntry,
  type AssistantChatMessage,
  type AssistantModelStatusResponse,
  type AssistantProposedAction,
  type AssistantResponseLength,
  withResponseLengthHint,
} from "@/lib/assistantChat";
import { readLocal, writeLocal } from "@/lib/storage";

export type AssistantActionUiStatus =
  | AssistantProposedAction["status"]
  | "confirming";

interface UseAssistantChatConversationOptions {
  responseLength: AssistantResponseLength;
}

const ASSISTANT_CHAT_HISTORY_STORAGE_KEY = "assistant-chat-history";
const MAX_PERSISTED_ASSISTANT_ENTRIES = 80;

export function useAssistantChatConversation({
  responseLength,
}: UseAssistantChatConversationOptions) {
  const [entries, setEntries] = useState<AssistantChatEntry[]>(
    () => readPersistedAssistantEntries()
  );
  const [sending, setSending] = useState(false);
  const [capabilities, setCapabilities] = useState<AssistantCapability[] | null>(
    null
  );
  const [modelStatus, setModelStatus] =
    useState<AssistantModelStatusResponse | null>(null);
  const [actionStatuses, setActionStatuses] = useState<
    Record<string, AssistantActionUiStatus>
  >({});
  const [actionErrors, setActionErrors] = useState<Record<string, string>>({});
  const entriesRef = useRef(entries);

  useEffect(() => {
    entriesRef.current = entries;
  }, [entries]);

  useEffect(() => {
    writeLocal(
      ASSISTANT_CHAT_HISTORY_STORAGE_KEY,
      entries.slice(-MAX_PERSISTED_ASSISTANT_ENTRIES)
    );
  }, [entries]);

  useEffect(() => {
    let cancelled = false;

    assistantChat
      .getCapabilities()
      .then((response) => {
        if (!cancelled) {
          setCapabilities(response.capabilities);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCapabilities([]);
        }
      });

    assistantChat
      .getModelStatus()
      .then((response) => {
        if (!cancelled) {
          setModelStatus(response);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setModelStatus(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    const normalizedText = text.trim();
    if (!normalizedText || sending) {
      return false;
    }

    const createdAt = new Date().toISOString();
    const userEntry: AssistantChatEntry = {
      id: makeId(),
      role: "user",
      content: normalizedText,
      createdAt,
    };

    setEntries((current) => [...current, userEntry]);
    setSending(true);

    try {
      const history: AssistantChatMessage[] = [
        ...entriesRef.current.map((entry) => ({
          role: entry.role,
          content: entry.content,
        })),
        {
          role: "user",
          content: withResponseLengthHint(normalizedText, responseLength),
        },
      ];
      const response = await assistantChat.sendMessage(history);

      setEntries((current) => [
        ...current,
        {
          id: makeId(),
          role: "assistant",
          content: response.content || response.answer || "(no response)",
          createdAt: new Date().toISOString(),
          blocks: response.blocks,
          sources: response.sources,
          proposedActions: response.proposedActions,
          provider: response.provider,
          route: response.route,
        },
      ]);
      return true;
    } catch (error) {
      setEntries((current) => [
        ...current,
        {
          id: makeId(),
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : "The assistant request failed.",
          createdAt: new Date().toISOString(),
          error: true,
        },
      ]);
      return false;
    } finally {
      setSending(false);
    }
  }, [responseLength, sending]);

  const confirmAction = useCallback(async (action: AssistantProposedAction) => {
    setActionStatuses((current) => ({ ...current, [action.id]: "confirming" }));
    setActionErrors((current) => ({ ...current, [action.id]: "" }));

    try {
      const response = await assistantChat.confirmAction(action.id);
      if (!response.ok) {
        throw new Error(response.error || "Action failed.");
      }
      setActionStatuses((current) => ({ ...current, [action.id]: "confirmed" }));
    } catch (error) {
      setActionStatuses((current) => ({ ...current, [action.id]: "failed" }));
      setActionErrors((current) => ({
        ...current,
        [action.id]:
          error instanceof Error ? error.message : "Action failed.",
      }));
    }
  }, []);

  const cancelAction = useCallback(async (action: AssistantProposedAction) => {
    setActionStatuses((current) => ({ ...current, [action.id]: "canceled" }));

    try {
      await assistantChat.cancelAction(action.id);
    } catch {
      // Already marked canceled locally; a failed cancel call is not actionable here.
    }
  }, []);

  const clearConversation = useCallback(() => {
    setEntries([]);
    setActionStatuses({});
    setActionErrors({});
  }, []);

  return {
    entries,
    sending,
    capabilities,
    modelStatus,
    actionStatuses,
    actionErrors,
    sendMessage,
    confirmAction,
    cancelAction,
    clearConversation,
  };
}

function makeId() {
  return `msg_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}

function readPersistedAssistantEntries() {
  const stored = readLocal<AssistantChatEntry[]>(ASSISTANT_CHAT_HISTORY_STORAGE_KEY);
  if (!Array.isArray(stored)) {
    return [];
  }

  return stored
    .filter(
      (entry) =>
        entry &&
        (entry.role === "user" || entry.role === "assistant") &&
        typeof entry.content === "string" &&
        typeof entry.createdAt === "string"
    )
    .slice(-MAX_PERSISTED_ASSISTANT_ENTRIES);
}
