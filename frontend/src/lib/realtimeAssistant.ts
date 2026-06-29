"use client";

import {
  createRealtimeFxGraph,
  type RealtimeVoiceFxSettings,
} from "./realtimeVoiceFx";

export type RealtimeAssistantStatus =
  | "idle"
  | "connecting"
  | "listening"
  | "thinking"
  | "speaking"
  | "error";

export interface RealtimeTranscriptEvent {
  itemId: string;
  role: "assistant" | "user";
  text: string;
  done: boolean;
}

interface RealtimeAssistantOptions {
  onStatus?: (status: RealtimeAssistantStatus) => void;
  onTranscript?: (event: RealtimeTranscriptEvent) => void;
  onToolCall?: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  onError?: (message: string) => void;
  onActiveTool?: (toolName: string | null) => void;
  /** Resolves the active TTS preset id to inherit (voice + persona) at connect time. */
  getPresetId?: () => string | null;
  /** Resolves the active preset's FX (approximated on the live stream via Web Audio). */
  getVoiceFx?: () => RealtimeVoiceFxSettings | null;
}

export interface RealtimeAssistantClient {
  connect(): Promise<void>;
  disconnect(): void;
  mute(): void;
  unmute(): void;
  sendTextMessage(text: string): void;
  sendContextUpdate(contextObj: unknown): void;
  sendSystemNote(note: string): void;
}

export function createRealtimeAssistant(
  opts: RealtimeAssistantOptions
): RealtimeAssistantClient {
  let peerConnection: RTCPeerConnection | null = null;
  let dataChannel: RTCDataChannel | null = null;
  let localStream: MediaStream | null = null;
  let audioElement: HTMLAudioElement | null = null;
  let audioContext: AudioContext | null = null;
  let manualDisconnect = false;
  let toolCallsInFlight = 0;
  const processedToolCalls = new Set<string>();
  const streamedFunctionArgs = new Map<string, string>();
  const transcriptBuffers = new Map<string, string>();

  async function connect() {
    opts.onStatus?.("connecting");
    manualDisconnect = false;

    try {
      localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioElement = document.createElement("audio");
      audioElement.autoplay = true;

      peerConnection = new RTCPeerConnection();
      dataChannel = peerConnection.createDataChannel("oai-events");
      let rejectChannelOpen = (_error: Error) => {};

      for (const track of localStream.getTracks()) {
        peerConnection.addTrack(track, localStream);
      }

      peerConnection.ontrack = (event) => {
        const stream = event.streams[0];
        if (!audioElement || !stream) {
          return;
        }
        audioElement.srcObject = stream;
        applyVoiceFx(stream);
      };

      peerConnection.onconnectionstatechange = () => {
        if (!peerConnection || manualDisconnect) {
          return;
        }

        if (
          peerConnection.connectionState === "failed" ||
          peerConnection.connectionState === "closed"
        ) {
          rejectChannelOpen(new Error("Realtime connection closed unexpectedly."));
          opts.onStatus?.("error");
          opts.onError?.("Realtime connection closed unexpectedly.");
        }
      };

      const channelOpen = new Promise<void>((resolve, reject) => {
        if (!dataChannel) {
          reject(new Error("Realtime data channel was not created."));
          return;
        }

        rejectChannelOpen = reject;
        dataChannel.onopen = () => resolve();
        dataChannel.onerror = () =>
          reject(new Error("Realtime data channel failed to open."));
        dataChannel.onclose = () =>
          reject(new Error("Realtime data channel closed before it was ready."));
      });

      // If the session POST fails, disconnect() closes the channel and this
      // promise rejects after we've already thrown. Mark it handled so the
      // real error (e.g. the OpenAI 400) surfaces instead of an unhandled
      // rejection overlay.
      void channelOpen.catch(() => {});

      dataChannel.onmessage = (event) => {
        void handleServerEvent(event.data);
      };

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      const offerSdp = offer.sdp;
      // Do NOT trim the SDP: it must keep its trailing CRLF or OpenAI's parser
      // rejects it with "failed to unmarshal SDP: EOF".
      if (!offerSdp || !offerSdp.trim()) {
        throw new Error("Realtime offer SDP was empty.");
      }

      const presetId = opts.getPresetId?.() ?? "";
      const sessionUrl = presetId
        ? `/api/realtime/session?preset=${encodeURIComponent(presetId)}`
        : "/api/realtime/session";

      const response = await fetch(sessionUrl, {
        method: "POST",
        headers: { "Content-Type": "application/sdp" },
        body: offerSdp,
      });

      if (!response.ok) {
        const message = await readErrorMessage(response);
        throw new Error(message || "Failed to start the realtime session.");
      }

      const answerSdp = await response.text();
      await peerConnection.setRemoteDescription({
        type: "answer",
        sdp: answerSdp,
      });

      await channelOpen;
      opts.onStatus?.("idle");
    } catch (error) {
      disconnect();
      opts.onStatus?.("error");
      opts.onError?.(
        error instanceof Error ? error.message : "Realtime connection failed."
      );
      throw error;
    }
  }

  function disconnect() {
    manualDisconnect = true;
    processedToolCalls.clear();
    streamedFunctionArgs.clear();
    transcriptBuffers.clear();
    toolCallsInFlight = 0;

    if (dataChannel) {
      dataChannel.close();
      dataChannel = null;
    }

    if (peerConnection) {
      peerConnection.close();
      peerConnection = null;
    }

    if (localStream) {
      for (const track of localStream.getTracks()) {
        track.stop();
      }
      localStream = null;
    }

    if (audioContext) {
      void audioContext.close().catch(() => {});
      audioContext = null;
    }

    if (audioElement) {
      audioElement.srcObject = null;
      audioElement.remove();
      audioElement = null;
    }

    opts.onActiveTool?.(null);
    opts.onStatus?.("idle");
  }

  // Route the remote voice through a Web Audio FX graph approximating the active
  // preset. Falls back to plain element playback when no preset FX is selected
  // or the graph can't be built.
  function applyVoiceFx(stream: MediaStream) {
    const settings = opts.getVoiceFx?.();
    if (!settings || !audioElement) {
      return;
    }

    try {
      const AudioCtor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtor) {
        return;
      }

      audioContext = new AudioCtor();
      const source = audioContext.createMediaStreamSource(stream);
      const graph = createRealtimeFxGraph(
        audioContext,
        settings.fx,
        settings.volume
      );
      source.connect(graph.input);
      graph.output.connect(audioContext.destination);

      // Chrome only pulls a remote WebRTC stream when it's attached to a media
      // element, so keep it attached but muted — the FX graph is the audible path.
      audioElement.muted = true;
      void audioContext.resume().catch(() => {});
    } catch {
      if (audioElement) {
        audioElement.muted = false;
      }
      audioContext = null;
    }
  }

  function mute() {
    for (const track of localStream?.getAudioTracks() ?? []) {
      track.enabled = false;
    }
  }

  function unmute() {
    for (const track of localStream?.getAudioTracks() ?? []) {
      track.enabled = true;
    }
  }

  function sendTextMessage(text: string) {
    const normalized = text.trim();
    if (!normalized) {
      return;
    }

    sendEvent({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: normalized }],
      },
    });
    sendEvent({ type: "response.create" });
  }

  function sendContextUpdate(contextObj: unknown) {
    sendEvent({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "system",
        content: [
          {
            type: "input_text",
            text: [
              "Current dashboard context. Treat this as the latest queue snapshot unless a tool returns fresher data.",
              JSON.stringify(contextObj),
            ].join("\n\n"),
          },
        ],
      },
    });
  }

  // Inject a short system note (e.g. the outcome of a user-confirmed action)
  // into the conversation without forcing a new spoken response.
  function sendSystemNote(note: string) {
    const text = note.trim();
    if (!text) {
      return;
    }

    sendEvent({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "system",
        content: [{ type: "input_text", text }],
      },
    });
  }

  async function handleServerEvent(rawData: string) {
    const event = safeParseEvent(rawData);
    if (!event?.type) {
      return;
    }

    switch (event.type) {
      case "session.created":
        opts.onStatus?.("idle");
        return;
      case "input_audio_buffer.speech_started":
        opts.onStatus?.("listening");
        return;
      case "response.created":
        opts.onStatus?.("thinking");
        return;
      case "response.output_audio.delta":
        opts.onStatus?.("speaking");
        return;
      case "response.output_audio_transcript.delta":
        emitTranscriptDelta(readItemId(event, "assistant"), "assistant", event);
        return;
      case "response.output_audio_transcript.done":
        emitTranscriptDone(readItemId(event, "assistant"), "assistant", event);
        return;
      case "response.output_text.delta":
        emitTranscriptDelta(readItemId(event, "assistant"), "assistant", event);
        return;
      case "response.output_text.done":
        emitTranscriptDone(readItemId(event, "assistant"), "assistant", event);
        return;
      case "conversation.item.input_audio_transcription.delta":
        emitTranscriptDelta(readItemId(event, "user"), "user", event);
        return;
      case "conversation.item.input_audio_transcription.completed":
        emitTranscriptDone(readItemId(event, "user"), "user", event);
        return;
      case "response.function_call_arguments.delta":
        accumulateFunctionArgs(event);
        return;
      case "response.function_call_arguments.done": {
        const callId = readCallId(event);
        await processToolCall({
          name: readFunctionName(event),
          callId,
          argumentsText:
            readFunctionArgs(event) || streamedFunctionArgs.get(callId) || "",
        });
        return;
      }
      case "response.output_item.done": {
        const outputItem = asRecord(event.item);
        if (outputItem?.type === "function_call") {
          await processToolCall({
            name: readFunctionName(outputItem),
            callId: readCallId(outputItem),
            argumentsText: readFunctionArgs(outputItem),
          });
        }
        return;
      }
      case "response.done": {
        const responsePayload = asRecord(event.response);
        const outputItems = Array.isArray(responsePayload?.output)
          ? responsePayload.output
          : [];
        let containsFunctionCall = false;
        const toolCallPromises: Promise<void>[] = [];

        for (const item of outputItems) {
          const outputItem = asRecord(item);
          if (outputItem?.type === "function_call") {
            containsFunctionCall = true;
            toolCallPromises.push(
              processToolCall({
                name: readFunctionName(outputItem),
                callId: readCallId(outputItem),
                argumentsText: readFunctionArgs(outputItem),
              })
            );
          }
        }

        await Promise.all(toolCallPromises);

        if (!containsFunctionCall && toolCallsInFlight === 0) {
          opts.onStatus?.("idle");
        }
        return;
      }
      case "error":
        opts.onStatus?.("error");
        opts.onError?.(readErrorText(event));
        return;
      default:
        return;
    }
  }

  async function processToolCall({
    name,
    callId,
    argumentsText,
  }: {
    name: string;
    callId: string;
    argumentsText: string;
  }) {
    if (!name || !callId || processedToolCalls.has(callId) || !dataChannel) {
      return;
    }

    processedToolCalls.add(callId);
    toolCallsInFlight += 1;
    opts.onActiveTool?.(name);

    try {
      const args = safeParseArguments(argumentsText);
      const output =
        (await opts.onToolCall?.(name, args)) ?? {
          ok: true,
          detail: "Tool completed.",
        };
      sendFunctionCallOutput(callId, output);
      opts.onStatus?.("thinking");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "The tool call failed.";

      try {
        sendFunctionCallOutput(callId, { ok: false, error: message });
        opts.onStatus?.("thinking");
      } catch (sendError) {
        opts.onStatus?.("error");
        opts.onError?.(
          sendError instanceof Error
            ? sendError.message
            : "Failed to return the tool result."
        );
      }
    } finally {
      toolCallsInFlight = Math.max(0, toolCallsInFlight - 1);
      streamedFunctionArgs.delete(callId);
      opts.onActiveTool?.(null);

      if (toolCallsInFlight === 0 && dataChannel?.readyState === "open") {
        try {
          sendEvent({ type: "response.create" });
        } catch (error) {
          opts.onStatus?.("error");
          opts.onError?.(
            error instanceof Error
              ? error.message
              : "Failed to continue the realtime response."
          );
        }
      }
    }
  }

  function sendEvent(event: Record<string, unknown>) {
    if (!dataChannel || dataChannel.readyState !== "open") {
      throw new Error("Realtime session is not connected.");
    }

    dataChannel.send(JSON.stringify(event));
  }

  function sendFunctionCallOutput(callId: string, output: unknown) {
    sendEvent({
      type: "conversation.item.create",
      item: {
        type: "function_call_output",
        call_id: callId,
        output: JSON.stringify(output),
      },
    });
  }

  function emitTranscript(event: RealtimeTranscriptEvent) {
    if (!event.text.trim()) {
      return;
    }

    opts.onTranscript?.(event);
  }

  function emitTranscriptDelta(
    itemId: string,
    role: "assistant" | "user",
    event: Record<string, unknown>
  ) {
    const delta = readTranscriptDeltaText(event);
    if (!delta.trim()) {
      return;
    }

    const text = `${transcriptBuffers.get(itemId) ?? ""}${delta}`;
    transcriptBuffers.set(itemId, text);
    emitTranscript({ itemId, role, text, done: false });
  }

  function emitTranscriptDone(
    itemId: string,
    role: "assistant" | "user",
    event: Record<string, unknown>
  ) {
    const text = readTranscriptDoneText(event) || transcriptBuffers.get(itemId) || "";
    transcriptBuffers.delete(itemId);
    emitTranscript({ itemId, role, text, done: true });
  }

  function accumulateFunctionArgs(event: Record<string, unknown>) {
    const callId = readCallId(event);
    if (!callId) {
      return;
    }

    const delta =
      typeof event.delta === "string"
        ? event.delta
        : typeof event.arguments_delta === "string"
          ? event.arguments_delta
          : "";
    streamedFunctionArgs.set(
      callId,
      `${streamedFunctionArgs.get(callId) ?? ""}${delta}`
    );
  }

  return {
    connect,
    disconnect,
    mute,
    unmute,
    sendTextMessage,
    sendContextUpdate,
    sendSystemNote,
  };
}

function safeParseEvent(rawData: string) {
  try {
    return JSON.parse(rawData) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function asRecord(value: unknown) {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function safeParseArguments(value: string) {
  const normalized = value.trim();
  if (!normalized) {
    return {};
  }

  try {
    const parsed = JSON.parse(normalized);
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return { rawArguments: normalized };
  }
}

function readFunctionName(source: Record<string, unknown>) {
  return typeof source.name === "string" ? source.name : "";
}

function readCallId(source: Record<string, unknown>) {
  return typeof source.call_id === "string" ? source.call_id : "";
}

function readFunctionArgs(source: Record<string, unknown>) {
  if (typeof source.arguments === "string") {
    return source.arguments;
  }

  if (typeof source.arguments_text === "string") {
    return source.arguments_text;
  }

  return "";
}

function readTranscriptDeltaText(source: Record<string, unknown>) {
  if (typeof source.delta === "string") {
    return source.delta;
  }

  if (typeof source.text === "string") {
    return source.text;
  }

  return "";
}

function readTranscriptDoneText(source: Record<string, unknown>) {
  if (typeof source.transcript === "string") {
    return source.transcript;
  }

  if (typeof source.text === "string") {
    return source.text;
  }

  return "";
}

function readItemId(
  source: Record<string, unknown>,
  fallbackPrefix: "assistant" | "user"
) {
  if (typeof source.item_id === "string" && source.item_id) {
    return source.item_id;
  }

  if (
    source.item &&
    typeof source.item === "object" &&
    typeof (source.item as { id?: unknown }).id === "string"
  ) {
    return (source.item as { id: string }).id;
  }

  return `${fallbackPrefix}-${crypto.randomUUID()}`;
}

function readErrorText(source: Record<string, unknown>) {
  if (
    source.error &&
    typeof source.error === "object" &&
    typeof (source.error as { message?: unknown }).message === "string"
  ) {
    return (source.error as { message: string }).message;
  }

  if (typeof source.message === "string") {
    return source.message;
  }

  return "Realtime session returned an error.";
}

async function readErrorMessage(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: string; detail?: string }
      | null;
    return payload?.detail || payload?.error || response.statusText;
  }

  return (await response.text().catch(() => "")) || response.statusText;
}
