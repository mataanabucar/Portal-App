export const TTS_TONE_PRESETS = {
  warmExecutive: {
    label: "Warm Executive",
    voice: "coral",
    instructions:
      "Speak in a calm, warm, confident, polished voice. Use a slightly lower, relaxed delivery with smooth pacing. Sound professional and composed, with subtle charm, but do not sound flirty, theatrical, exaggerated, or overly casual. Pause naturally between sections and make the content easy to follow.",
  },
  calmBriefing: {
    label: "Calm Briefing",
    voice: "marin",
    instructions:
      "Speak like a calm professional briefing. Clear, steady, composed, and easy to follow. Use smooth pacing and natural pauses. Avoid sounding robotic, rushed, dramatic, or overly enthusiastic.",
  },
  lateNightExecutive: {
    label: "Late-Night Executive",
    voice: "ballad",
    instructions:
      "Speak with a low, relaxed, confident tone. Keep the delivery professional, calm, and subtly charismatic. Use slower pacing and smooth intonation. Do not sound seductive, flirty, or performative.",
  },
} as const;

export type TonePresetKey = keyof typeof TTS_TONE_PRESETS;
export type TtsState = "idle" | "loading" | "playing";

export const VOICE_REPLAY_TTS_INSTRUCTIONS =
  "Read this like a smart, warm, playful girlfriend giving Mataan a clear work briefing. Keep it sexy-friendly, confident, personal, and work-appropriate. Use natural pauses, make the next steps easy to follow, and do not sound vulgar, theatrical, or overly dramatic.";

let currentAudio: HTMLAudioElement | null = null;
let currentObjectUrl: string | null = null;
let currentStopCallback: (() => void) | null = null;
let currentAbortController: AbortController | null = null;

export function stopPortalTts(): void {
  if (currentStopCallback) {
    currentStopCallback();
    currentStopCallback = null;
  }
  currentAbortController?.abort();
  currentAbortController = null;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = null;
  }
}

export async function playPortalTts({
  text,
  tonePreset,
  voice,
  instructions,
  speed,
  playbackRate = 0.95,
  format = "mp3",
  volume = 1.0,
  onStateChange,
  onError,
}: {
  text: string;
  tonePreset?: TonePresetKey | "custom";
  voice?: string;
  instructions?: string;
  speed?: number;
  playbackRate?: number;
  format?: string;
  volume?: number;
  onStateChange?: (state: TtsState) => void;
  onError?: (message: string) => void;
}): Promise<void> {
  stopPortalTts();
  onStateChange?.("loading");

  const abortController = new AbortController();
  currentAbortController = abortController;
  currentStopCallback = () => onStateChange?.("idle");

  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        tonePreset: tonePreset && tonePreset !== "custom" ? tonePreset : undefined,
        voice,
        instructions,
        speed,
        format,
        volume,
      }),
      signal: abortController.signal,
    });

    if (abortController.signal.aborted) return;

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error((errBody as { error?: string }).error ?? res.statusText);
    }

    const blob = await res.blob();
    if (abortController.signal.aborted) return;

    const url = URL.createObjectURL(blob);
    currentObjectUrl = url;

    const audio = new Audio(url);
    audio.playbackRate = playbackRate;
    currentAudio = audio;

    audio.addEventListener("ended", () => {
      if (currentObjectUrl === url) {
        URL.revokeObjectURL(url);
        currentObjectUrl = null;
      }
      currentAudio = null;
      currentStopCallback = null;
      currentAbortController = null;
      onStateChange?.("idle");
    });

    audio.addEventListener("error", () => {
      onStateChange?.("idle");
      onError?.("Audio playback failed.");
    });

    onStateChange?.("playing");
    await audio.play();
  } catch (err) {
    if ((err as Error).name === "AbortError") return;
    currentStopCallback = null;
    currentAbortController = null;
    onStateChange?.("idle");
    onError?.((err as Error).message);
  }
}
