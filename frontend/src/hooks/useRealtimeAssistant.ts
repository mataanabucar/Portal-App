"use client";

import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import { api } from "@/lib/api";
import { buildCardItems } from "@/lib/merge";
import { readLocal, writeLocal } from "@/lib/storage";
import { DEFAULT_FX } from "@/lib/voiceFx";
import type { RealtimeVoiceFxSettings } from "@/lib/realtimeVoiceFx";
import {
  createMicCleanup,
  DEFAULT_MIC_CLEANUP_SETTINGS,
  type MicCleanupDebug,
  type MicCleanupSettings,
} from "@/lib/micCleanup";
import {
  buildRealtimeContext,
  type RealtimeContextPayload,
} from "@/lib/realtimeContext";
import {
  createRealtimeAssistant,
  type RealtimeAssistantClient,
  type RealtimeAssistantStatus,
  type RealtimeTranscriptEvent,
} from "@/lib/realtimeAssistant";
import type {
  DashboardCardItem,
  DashboardResponse,
} from "@/lib/types";

export interface RealtimeMessage {
  id: string;
  role: "assistant" | "user";
  text: string;
  done: boolean;
}

export interface RealtimePresetOption {
  id: string;
  label: string;
  voice?: string;
}

export interface PendingEmailAttachment {
  name: string;
  contentType: string;
  contentBase64: string;
  size: number;
}

export interface PendingEmail {
  to: string[];
  cc: string[];
  subject: string;
  body: string;
  bodyType: "Text" | "HTML";
  attachments: PendingEmailAttachment[];
}

export type EmailSendStatus =
  | { state: "idle" }
  | { state: "awaiting" }
  | { state: "sending" }
  | { state: "sent"; messageId: string; webLink: string | null }
  | { state: "cancelled" }
  | { state: "error"; message: string };

const REALTIME_PRESET_KEY = "realtime-preset-id";
const MIC_CLEANUP_SETTINGS_KEY = "realtime-mic-cleanup-settings";
const EMAIL_MAX_ATTACHMENTS = 5;
const EMAIL_MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024;

interface UseRealtimeAssistantOptions {
  items: DashboardCardItem[];
  summary?: string;
  tone?: string;
  refreshing?: boolean;
  refresh: () => Promise<DashboardResponse | undefined>;
}

interface ResearchToolArgs {
  itemTitleOrId?: unknown;
  question?: unknown;
}

interface EmailToolArgs {
  requestId?: unknown;
  relatedActionItem?: unknown;
}

interface AskToolArgs {
  question?: unknown;
  itemContext?: unknown;
}

interface DocsToolArgs {
  query?: unknown;
}

interface SendEmailToolArgs {
  to?: unknown;
  cc?: unknown;
  subject?: unknown;
  body?: unknown;
}

interface SearchToolArgs {
  query?: unknown;
  limit?: unknown;
}

interface RecentEmailsToolArgs {
  limit?: unknown;
}

export function useRealtimeAssistant({
  items,
  summary,
  tone,
  refreshing = false,
  refresh,
}: UseRealtimeAssistantOptions) {
  const clientRef = useRef<RealtimeAssistantClient | null>(null);
  const itemsRef = useRef(items);
  const summaryRef = useRef(summary);
  const toneRef = useRef(tone);
  const refreshingRef = useRef(refreshing);
  const refreshRef = useRef(refresh);
  const wasRefreshingRef = useRef(refreshing);
  const lastContextSnapshotRef = useRef("");

  const [status, setStatus] = useState<RealtimeAssistantStatus>("idle");
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [messages, setMessages] = useState<RealtimeMessage[]>([]);
  const [activeToolName, setActiveToolName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [presets, setPresets] = useState<RealtimePresetOption[]>([]);
  const [presetId, setPresetId] = useState<string>(
    () => readLocal<string>(REALTIME_PRESET_KEY) ?? ""
  );
  const presetIdRef = useRef(presetId);
  const presetFxRef = useRef<Map<string, RealtimeVoiceFxSettings>>(new Map());
  const [pendingEmail, setPendingEmail] = useState<PendingEmail | null>(null);
  const [emailStatus, setEmailStatus] = useState<EmailSendStatus>({ state: "idle" });
  const [micSettings, setMicSettings] = useState<MicCleanupSettings>(() => ({
    ...DEFAULT_MIC_CLEANUP_SETTINGS,
    ...(readLocal<Partial<MicCleanupSettings>>(MIC_CLEANUP_SETTINGS_KEY) ?? {}),
  }));
  const micSettingsRef = useRef(micSettings);
  const [micDebug, setMicDebug] = useState<MicCleanupDebug | null>(null);
  const [isMicTesting, setIsMicTesting] = useState(false);
  // Standalone cleanup instance used only by the "Test microphone" button.
  const micTestRef = useRef<ReturnType<typeof createMicCleanup> | null>(null);

  useEffect(() => {
    micSettingsRef.current = micSettings;
  }, [micSettings]);

  useEffect(() => {
    itemsRef.current = items;
    summaryRef.current = summary;
    toneRef.current = tone;
    refreshingRef.current = refreshing;
    refreshRef.current = refresh;
  }, [items, summary, tone, refreshing, refresh]);

  useEffect(() => {
    presetIdRef.current = presetId;
  }, [presetId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/tts/presets");
        if (!response.ok) {
          return;
        }
        const data = (await response.json()) as Array<{
          id?: unknown;
          label?: unknown;
          voice?: unknown;
          volume?: unknown;
          fx?: unknown;
        }>;
        if (cancelled || !Array.isArray(data)) {
          return;
        }
        const valid = data.filter((preset) => typeof preset?.id === "string");
        const fxMap = new Map<string, RealtimeVoiceFxSettings>();
        for (const preset of valid) {
          fxMap.set(preset.id as string, {
            fx: {
              ...DEFAULT_FX,
              ...(preset.fx && typeof preset.fx === "object" ? preset.fx : {}),
            },
            volume: typeof preset.volume === "number" ? preset.volume : 1,
          });
        }
        presetFxRef.current = fxMap;
        setPresets(
          valid.map((preset) => ({
            id: preset.id as string,
            label:
              typeof preset.label === "string" && preset.label.trim()
                ? preset.label
                : (preset.id as string),
            voice: typeof preset.voice === "string" ? preset.voice : undefined,
          }))
        );
      } catch {
        // Preset list is best-effort; the assistant still works without it.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  function selectPreset(nextPresetId: string) {
    setPresetId(nextPresetId);
    writeLocal(REALTIME_PRESET_KEY, nextPresetId);
  }

  const handleStatus = useEffectEvent((nextStatus: RealtimeAssistantStatus) => {
    setStatus(nextStatus);
  });

  const handleError = useEffectEvent((message: string) => {
    clientRef.current?.disconnect();
    clientRef.current = null;
    setIsConnected(false);
    setIsMuted(false);
    setActiveToolName(null);
    setError(message);
    setStatus("error");
  });

  const handleActiveTool = useEffectEvent((toolName: string | null) => {
    setActiveToolName(toolName ? formatToolLabel(toolName) : null);
  });

  const handleMicDebug = useEffectEvent((debug: MicCleanupDebug) => {
    setMicDebug(debug);
  });

  const handleTranscript = useEffectEvent((event: RealtimeTranscriptEvent) => {
    setMessages((current) => upsertRealtimeMessage(current, event));
  });

  const handleToolCall = useEffectEvent(
    async (toolName: string, args: Record<string, unknown>) => {
      switch (toolName) {
        case "get_queue_snapshot":
          return runGetQueueSnapshot();
        case "refresh_queue":
          return runRefreshQueue();
        case "research_item":
          return runResearchItem(args as ResearchToolArgs);
        case "get_item_email_context":
          return runGetItemEmailContext(args as EmailToolArgs);
        case "ask_portal_question":
          return runAskPortalQuestion(args as AskToolArgs);
        case "search_docs":
          return runSearchDocs(args as DocsToolArgs);
        case "send_email":
          return runSendEmail(args as SendEmailToolArgs);
        case "search_emails":
          return runSearchEmails(args as SearchToolArgs);
        case "search_chats":
          return runSearchChats(args as SearchToolArgs);
        case "get_recent_emails":
          return runGetRecentEmails(args as RecentEmailsToolArgs);
        default:
          return { ok: false, error: `Unknown tool: ${toolName}` };
      }
    }
  );

  useEffect(() => {
    if (wasRefreshingRef.current && !refreshing && isConnected) {
      void sendDashboardContext(itemsRef.current, {
        summary: summaryRef.current,
        tone: toneRef.current,
        refreshing: false,
      });
    }

    wasRefreshingRef.current = refreshing;
  }, [isConnected, refreshing]);

  useEffect(() => {
    return () => {
      clientRef.current?.disconnect();
      clientRef.current = null;
      micTestRef.current?.stop();
      micTestRef.current = null;
    };
  }, []);

  async function connect() {
    if (clientRef.current) {
      return;
    }

    setError(null);

    const client = createRealtimeAssistant({
      onStatus: handleStatus,
      onTranscript: handleTranscript,
      onToolCall: handleToolCall,
      onError: handleError,
      onActiveTool: handleActiveTool,
      getPresetId: () => presetIdRef.current,
      getVoiceFx: () => {
        const id = presetIdRef.current;
        return id ? presetFxRef.current.get(id) ?? null : null;
      },
      getMicSettings: () => micSettingsRef.current,
      onMicDebug: handleMicDebug,
    });

    clientRef.current = client;

    try {
      await client.connect();
      lastContextSnapshotRef.current = "";
      setIsConnected(true);
      setIsMuted(false);
      setStatus("idle");
      await sendDashboardContext(itemsRef.current, {
        summary: summaryRef.current,
        tone: toneRef.current,
        refreshing: refreshingRef.current,
      });
    } catch {
      clientRef.current = null;
      setIsConnected(false);
      setIsMuted(false);
    }
  }

  function disconnect() {
    clientRef.current?.disconnect();
    clientRef.current = null;
    lastContextSnapshotRef.current = "";
    setIsConnected(false);
    setIsMuted(false);
    setActiveToolName(null);
    setMicDebug(null);
    setStatus("idle");
  }

  function toggleMute() {
    const client = clientRef.current;
    if (!client) {
      return;
    }

    if (isMuted) {
      client.unmute();
      setIsMuted(false);
      return;
    }

    client.mute();
    setIsMuted(true);
  }

  // Merge + persist mic-cleanup settings. Gate/timing changes apply to the live
  // session immediately; native-constraint toggles (echo/noise/AGC) take effect
  // on the next session, since they require re-acquiring the microphone.
  function updateMicSettings(partial: Partial<MicCleanupSettings>) {
    setMicSettings((current) => {
      const next = { ...current, ...partial };
      micSettingsRef.current = next;
      writeLocal(MIC_CLEANUP_SETTINGS_KEY, next);
      clientRef.current?.updateMicSettings(partial);
      micTestRef.current?.updateSettings(partial);
      return next;
    });
  }

  function stopMicTest() {
    micTestRef.current?.stop();
    micTestRef.current = null;
    setIsMicTesting(false);
    setMicDebug(null);
  }

  // Spin up a temporary cleanup instance (no WebRTC) so the user can check their
  // mic and tune the threshold via the live meter without starting a session.
  async function testMic(): Promise<boolean> {
    if (micTestRef.current) {
      stopMicTest();
      return false;
    }

    try {
      const tester = createMicCleanup(
        {
          onDebug: (debug) => setMicDebug(debug),
          onError: (testError) => {
            setError(testError.message);
            stopMicTest();
          },
        },
        micSettingsRef.current
      );
      await tester.start();
      micTestRef.current = tester;
      setIsMicTesting(true);

      // Auto-stop the test after 15s so a forgotten mic doesn't stay open.
      window.setTimeout(() => {
        if (micTestRef.current === tester) {
          stopMicTest();
        }
      }, 15000);
      return true;
    } catch (testError) {
      setError(
        testError instanceof Error
          ? testError.message
          : "Could not access the microphone."
      );
      return false;
    }
  }

  function sendText(text: string) {
    const normalized = text.trim();
    if (!normalized || !clientRef.current) {
      return;
    }

    setMessages((current) =>
      capRealtimeMessages([
        ...current,
        {
          id: `local-user-${crypto.randomUUID()}`,
          role: "user",
          text: normalized,
          done: true,
        },
      ])
    );
    try {
      clientRef.current.sendTextMessage(normalized);
    } catch (error) {
      handleError(
        error instanceof Error ? error.message : "Failed to send the message."
      );
    }
  }

  async function sendDashboardContext(
    nextItems: DashboardCardItem[],
    opts: { summary?: string; tone?: string; refreshing?: boolean } = {}
  ) {
    const client = clientRef.current;
    if (!client) {
      return;
    }

    const context = buildRealtimeContext(nextItems, opts);
    const snapshot = JSON.stringify(context);
    if (snapshot === lastContextSnapshotRef.current) {
      return;
    }

    try {
      client.sendContextUpdate(context);
      lastContextSnapshotRef.current = snapshot;
    } catch (error) {
      handleError(
        error instanceof Error
          ? error.message
          : "Failed to send the dashboard context."
      );
    }
  }

  function clearConversation() {
    setMessages([]);
    setError(null);
  }

  async function runGetQueueSnapshot() {
    const cached = await api.dashboardCache().catch(() => null);
    if (cached?.payload) {
      const snapshotItems = buildCardItems(cached.payload);
      return {
        ok: true,
        context: buildRealtimeContext(snapshotItems, {
          summary: cached.payload.summary?.summary,
          tone: toneRef.current,
          refreshing: false,
        }),
      };
    }

    return {
      ok: true,
      context: buildRealtimeContext(itemsRef.current, {
        summary: summaryRef.current,
        tone: toneRef.current,
        refreshing: refreshingRef.current,
      }),
    };
  }

  async function runRefreshQueue() {
    const fresh = await refreshRef.current();
    if (!fresh) {
      return { ok: false, error: "Queue refresh failed." };
    }

    const refreshedItems = buildCardItems(fresh);
    const context = buildRealtimeContext(refreshedItems, {
      summary: fresh.summary?.summary,
      tone: toneRef.current,
      refreshing: false,
    });
    await sendContextFromPayload(context);

    return {
      ok: true,
      refreshedAt: new Date().toISOString(),
      context,
    };
  }

  async function runResearchItem({
    itemTitleOrId,
    question,
  }: ResearchToolArgs) {
    const normalizedQuestion = normalizeText(question);
    const normalizedReference = normalizeText(itemTitleOrId);

    if (!normalizedQuestion || !normalizedReference) {
      return {
        ok: false,
        error: "research_item requires itemTitleOrId and question.",
      };
    }

    const item = resolveQueueItem(normalizedReference, itemsRef.current);
    const itemContext = buildResearchItemContext(item, normalizedReference);
    const result = await api.research({
      query: normalizedQuestion,
      itemContext,
      messages: [],
    });

    return {
      ok: true,
      item: item ? summarizeQueueItem(item) : normalizedReference,
      report: {
        quickTake: result.report.quickTake,
        confidence: result.report.confidence,
        whatWeFound: result.report.whatWeFound.slice(0, 4),
        whatIsMissing: result.report.whatIsMissing.slice(0, 4),
        actionItems: result.report.actionItems.slice(0, 4),
      },
      sources: {
        codeFindings: result.codeFindings.length,
        kbFindings: result.kbFindings.length,
        docsFindings: result.docsFindings.length,
      },
    };
  }

  async function runGetItemEmailContext({
    requestId,
    relatedActionItem,
  }: EmailToolArgs) {
    const normalizedRequestId = normalizeText(requestId);
    const normalizedRelatedActionItem = normalizeText(relatedActionItem);
    if (!normalizedRequestId && !normalizedRelatedActionItem) {
      return {
        ok: false,
        error:
          "get_item_email_context requires requestId or relatedActionItem.",
      };
    }

    const payload = await api.itemEmail({
      requestId: normalizedRequestId || undefined,
      relatedActionItem: normalizedRelatedActionItem || undefined,
    });

    if (!payload.email) {
      return { ok: true, email: null };
    }

    return {
      ok: true,
      email: {
        subject: payload.email.subject,
        from:
          payload.email.from?.name ||
          payload.email.from?.address ||
          "Unknown sender",
        receivedDateTime: payload.email.receivedDateTime,
        preview: stripHtml(payload.email.body.content).slice(0, 700),
      },
    };
  }

  async function runAskPortalQuestion({
    question,
    itemContext,
  }: AskToolArgs) {
    const normalizedQuestion = normalizeText(question);
    if (!normalizedQuestion) {
      return { ok: false, error: "ask_portal_question requires question." };
    }

    const prompt = [normalizedQuestion, normalizeText(itemContext)]
      .filter(Boolean)
      .join("\n\nItem context:\n");
    const response = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      const payload = (await response
        .json()
        .catch(() => ({ error: response.statusText }))) as { error?: string };
      throw new Error(payload.error || response.statusText);
    }

    const payload = (await response.json()) as {
      enabled?: boolean;
      provider?: string;
      model?: string;
      answer?: string;
    };

    return {
      ok: payload.enabled !== false,
      provider: payload.provider,
      model: payload.model,
      answer: normalizeText(payload.answer),
    };
  }

  async function runSearchDocs({ query }: DocsToolArgs) {
    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery) {
      return { ok: false, error: "search_docs requires a query." };
    }

    const response = await fetch("/api/docs/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: normalizedQuery }),
    });

    if (!response.ok) {
      const payload = (await response
        .json()
        .catch(() => ({ error: response.statusText }))) as { error?: string };
      throw new Error(payload.error || response.statusText);
    }

    const payload = (await response.json()) as {
      results?: Array<{ doc?: string | null; heading?: string | null; text?: string }>;
    };
    const results = Array.isArray(payload.results) ? payload.results : [];

    if (results.length === 0) {
      return { ok: true, matches: [], note: "No relevant documentation found." };
    }

    return {
      ok: true,
      matches: results.slice(0, 5).map((result) => ({
        doc: result.doc ?? null,
        heading: result.heading ?? null,
        excerpt: typeof result.text === "string" ? result.text.slice(0, 900) : "",
      })),
    };
  }

  async function runSearchEmails({ query, limit }: SearchToolArgs) {
    return runGraphSearch("/api/email/search", query, limit, "search_emails");
  }

  async function runSearchChats({ query, limit }: SearchToolArgs) {
    return runGraphSearch("/api/chats/search", query, limit, "search_chats");
  }

  // List the most recent emails (date-ordered, newest first). Unlike the
  // keyword search this needs no query, so it answers "what's my last email".
  async function runGetRecentEmails({ limit }: RecentEmailsToolArgs) {
    const parsedLimit =
      typeof limit === "number" && Number.isFinite(limit) ? limit : undefined;

    const response = await fetch("/api/email/recent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ limit: parsedLimit }),
    });

    if (!response.ok) {
      const payload = (await response
        .json()
        .catch(() => ({ error: response.statusText }))) as { error?: string };
      throw new Error(payload.error || response.statusText);
    }

    const payload = (await response.json()) as {
      count?: number;
      results?: unknown[];
    };
    const results = Array.isArray(payload.results) ? payload.results : [];

    if (results.length === 0) {
      return { ok: true, count: 0, results: [], note: "No recent emails found." };
    }

    return { ok: true, count: payload.count ?? results.length, results };
  }

  async function runGraphSearch(
    path: string,
    query: unknown,
    limit: unknown,
    toolName: string
  ) {
    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery) {
      return { ok: false, error: `${toolName} requires a query.` };
    }

    const parsedLimit =
      typeof limit === "number" && Number.isFinite(limit) ? limit : undefined;

    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: normalizedQuery, limit: parsedLimit }),
    });

    if (!response.ok) {
      const payload = (await response
        .json()
        .catch(() => ({ error: response.statusText }))) as { error?: string };
      throw new Error(payload.error || response.statusText);
    }

    const payload = (await response.json()) as {
      count?: number;
      results?: unknown[];
    };
    const results = Array.isArray(payload.results) ? payload.results : [];

    if (results.length === 0) {
      return { ok: true, count: 0, results: [], note: "No matches found." };
    }

    return { ok: true, count: payload.count ?? results.length, results };
  }

  async function runSendEmail({ to, cc, subject, body }: SendEmailToolArgs) {
    const recipients = normalizeEmailRecipients(to);
    const ccRecipients = normalizeEmailRecipients(cc);
    const normalizedSubject = normalizeText(subject);
    const normalizedBody = normalizeText(body);

    if (recipients.length === 0) {
      return { ok: false, error: "send_email requires at least one 'to' recipient." };
    }
    if (!normalizedSubject) {
      return { ok: false, error: "send_email requires a subject." };
    }
    if (!normalizedBody) {
      return { ok: false, error: "send_email requires a body." };
    }

    setPendingEmail({
      to: recipients,
      cc: ccRecipients,
      subject: normalizedSubject,
      body: normalizedBody,
      bodyType: "Text",
      attachments: [],
    });
    setEmailStatus({ state: "awaiting" });

    // Minimal metadata back to the assistant; the message is NOT sent yet.
    return {
      ok: true,
      status: "awaiting_user_confirmation",
      to: recipients,
      cc: ccRecipients,
      subject: normalizedSubject,
      note: "Email staged. It will only be sent after Mataan confirms it in the portal UI.",
    };
  }

  async function confirmSendEmail() {
    const draft = pendingEmail;
    if (!draft || emailStatus.state === "sending") {
      return;
    }

    setEmailStatus({ state: "sending" });
    try {
      const response = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: draft.to,
          cc: draft.cc,
          subject: draft.subject,
          body: draft.body,
          bodyType: draft.bodyType,
          attachments: draft.attachments.map((attachment) => ({
            name: attachment.name,
            contentType: attachment.contentType,
            contentBase64: attachment.contentBase64,
          })),
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        messageId?: string;
        webLink?: string | null;
        error?: string;
      };

      if (!response.ok || payload.ok === false) {
        setEmailStatus({
          state: "error",
          message: payload.error || response.statusText || "Failed to send email.",
        });
        return;
      }

      setEmailStatus({
        state: "sent",
        messageId: payload.messageId ?? "",
        webLink: payload.webLink ?? null,
      });
      setPendingEmail(null);

      // Best-effort: tell the assistant the outcome (minimal metadata only).
      try {
        clientRef.current?.sendSystemNote(
          `Email send confirmed by Mataan. status=sent messageId=${payload.messageId ?? "unknown"}.`
        );
      } catch {
        // The session may be closed; the UI already reflects the result.
      }
    } catch (error) {
      setEmailStatus({
        state: "error",
        message: error instanceof Error ? error.message : "Failed to send email.",
      });
    }
  }

  function cancelSendEmail() {
    setPendingEmail(null);
    setEmailStatus({ state: "cancelled" });
    try {
      clientRef.current?.sendSystemNote("Mataan cancelled the staged email; it was not sent.");
    } catch {
      // No active session — nothing to notify.
    }
  }

  async function addEmailAttachment(file: File) {
    if (file.size > EMAIL_MAX_ATTACHMENT_BYTES) {
      setEmailStatus({ state: "error", message: `${file.name} exceeds the 3 MB limit.` });
      return;
    }

    try {
      const contentBase64 = await fileToBase64(file);
      setPendingEmail((current) =>
        current
          ? {
              ...current,
              attachments: [
                ...current.attachments,
                {
                  name: file.name,
                  contentType: file.type || "application/octet-stream",
                  contentBase64,
                  size: file.size,
                },
              ].slice(0, EMAIL_MAX_ATTACHMENTS),
            }
          : current
      );
    } catch {
      setEmailStatus({ state: "error", message: `Failed to read ${file.name}.` });
    }
  }

  function removeEmailAttachment(index: number) {
    setPendingEmail((current) =>
      current
        ? {
            ...current,
            attachments: current.attachments.filter((_, i) => i !== index),
          }
        : current
    );
  }

  async function sendContextFromPayload(context: RealtimeContextPayload) {
    const client = clientRef.current;
    if (!client) {
      return;
    }

    const snapshot = JSON.stringify(context);
    if (snapshot === lastContextSnapshotRef.current) {
      return;
    }

    try {
      client.sendContextUpdate(context);
      lastContextSnapshotRef.current = snapshot;
    } catch (error) {
      handleError(
        error instanceof Error
          ? error.message
          : "Failed to send the dashboard context."
      );
    }
  }

  return {
    status,
    isConnected,
    isMuted,
    messages,
    activeToolName,
    error,
    presets,
    presetId,
    selectPreset,
    pendingEmail,
    emailStatus,
    confirmSendEmail,
    cancelSendEmail,
    addEmailAttachment,
    removeEmailAttachment,
    connect,
    disconnect,
    toggleMute,
    micSettings,
    micDebug,
    updateMicSettings,
    testMic,
    isMicTesting,
    sendText,
    sendDashboardContext,
    clearConversation,
  };
}

function upsertRealtimeMessage(
  current: RealtimeMessage[],
  event: RealtimeTranscriptEvent
) {
  const next = [...current];
  const index = next.findIndex((message) => message.id === event.itemId);
  const text = event.text.trim();

  if (!text) {
    return next;
  }

  const value: RealtimeMessage = {
    id: event.itemId,
    role: event.role,
    text,
    done: event.done,
  };

  if (index === -1) {
    return capRealtimeMessages([...next, value]);
  }

  next[index] = value;
  return capRealtimeMessages(next);
}

function capRealtimeMessages(messages: RealtimeMessage[]) {
  return messages.slice(-24);
}

function formatToolLabel(toolName: string) {
  switch (toolName) {
    case "get_queue_snapshot":
      return "Checking queue...";
    case "refresh_queue":
      return "Refreshing queue...";
    case "research_item":
      return "Researching item...";
    case "get_item_email_context":
      return "Checking email context...";
    case "ask_portal_question":
      return "Reviewing portal context...";
    case "search_docs":
      return "Searching documentation...";
    case "search_emails":
      return "Searching email...";
    case "get_recent_emails":
      return "Checking recent email...";
    case "search_chats":
      return "Searching Teams chats...";
    case "send_email":
      return "Preparing email...";
    default:
      return "Running tool...";
  }
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmailRecipients(value: unknown): string[] {
  const raw = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[,;]/)
      : [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const entry of raw) {
    const address = typeof entry === "string" ? entry.trim() : "";
    const key = address.toLowerCase();
    if (address && !seen.has(key)) {
      seen.add(key);
      out.push(address);
    }
  }
  return out;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("File read failed."));
    reader.readAsDataURL(file);
  });
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function resolveQueueItem(reference: string, items: DashboardCardItem[]) {
  const normalizedReference = reference.trim().toLowerCase();
  if (!normalizedReference) {
    return null;
  }

  for (const item of items) {
    const requestId = readItemDetail(item, "Request ID").toLowerCase();
    const relatedActionItem = readItemDetail(item, "Related Action Item").toLowerCase();
    const title = item.title.toLowerCase();
    const id = item.id.toLowerCase();

    if (
      normalizedReference === id ||
      normalizedReference === requestId ||
      normalizedReference === relatedActionItem ||
      title.includes(normalizedReference)
    ) {
      return item;
    }
  }

  return null;
}

function buildResearchItemContext(
  item: DashboardCardItem | null,
  fallbackReference: string
) {
  if (!item) {
    return `Queue item reference: ${fallbackReference}`;
  }

  const lines = [
    `Title: ${item.title}`,
    item.summary && `Summary: ${item.summary}`,
    item.nextAction && `Next Action: ${item.nextAction}`,
    item.blockersOpenQuestions.length > 0 &&
      `Blockers: ${item.blockersOpenQuestions.join("; ")}`,
    readItemDetail(item, "Request ID") &&
      `Request ID: ${readItemDetail(item, "Request ID")}`,
    readItemDetail(item, "Related Action Item") &&
      `Related Action Item: ${readItemDetail(item, "Related Action Item")}`,
    readItemDetail(item, "Application") &&
      `Application: ${readItemDetail(item, "Application")}`,
    readItemDetail(item, "Business / Customer") &&
      `Business / Customer: ${readItemDetail(item, "Business / Customer")}`,
  ].filter(Boolean);

  return lines.join("\n");
}

function summarizeQueueItem(item: DashboardCardItem) {
  return {
    id: item.id,
    title: item.title,
    status: item.status.label,
    priority: item.priority.label,
    due: item.due.relative || item.due.date,
  };
}

function readItemDetail(item: DashboardCardItem, label: string) {
  const value = item.keyDetails.find((entry) => entry.label === label)?.value ?? "";
  return value === "Not visible" ? "" : value;
}
