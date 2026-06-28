import { readLocal, writeLocal } from "./storage";
import { TTS_TONE_PRESETS, type TonePresetKey } from "./tts";
import { DEFAULT_FX, type VoiceFx, buildFfmpegChain } from "./voiceFx";

export type TtsResponseFormat = "mp3" | "opus" | "aac" | "flac" | "wav" | "pcm";

// Kept for backward compatibility with older saved values.
export type TtsPresetOption = TonePresetKey | "custom";

export const TTS_VOICES = ["nova", "shimmer", "coral", "sage", "marin", "cedar", "verse"] as const;
export type TtsVoice = (typeof TTS_VOICES)[number];

export interface TtsConfig {
  /** Active preset id (built-in, safe, or user-defined). */
  preset: string;
  voice: string;
  instructions: string;
  speed: number;
  playbackRate: number;
  responseFormat: TtsResponseFormat;
  testScript: string;
  volume: number;
  /** When true, the generated FFmpeg chain is sent to the server for post-processing. */
  applyFfmpeg: boolean;
  /** Prefer librubberband for pitch/tempo (build-dependent); otherwise asetrate/atempo. */
  useRubberband: boolean;
  /** Path to the MrsWatson VST host binary (machine-specific). */
  vstHostPath: string;
  /** Friendly FX control values. */
  fx: VoiceFx;
}

const TTS_CONFIG_KEY = "tts-config";

export const DEFAULT_TTS_CONFIG: TtsConfig = {
  preset: "cleanAssistant",
  voice: TTS_TONE_PRESETS.warmExecutive.voice,
  instructions: TTS_TONE_PRESETS.warmExecutive.instructions,
  speed: 1.0,
  playbackRate: 0.95,
  responseFormat: "mp3",
  volume: 1.0,
  applyFfmpeg: false,
  useRubberband: false,
  vstHostPath: "mrswatson64",
  fx: DEFAULT_FX,
  testScript:
    "Good morning. Here is a quick summary of your portal queue for today. All items appear to be on track. Please review the following priorities and take action where needed.",
};

export function readTtsConfig(): TtsConfig {
  const saved = readLocal<Partial<TtsConfig>>(TTS_CONFIG_KEY);
  if (!saved) return { ...DEFAULT_TTS_CONFIG, fx: { ...DEFAULT_FX } };
  return {
    ...DEFAULT_TTS_CONFIG,
    ...saved,
    // Deep-merge fx so older saved configs (without fx) still load cleanly.
    fx: { ...DEFAULT_FX, ...(saved.fx ?? {}) },
  };
}

export function writeTtsConfig(config: TtsConfig): void {
  writeLocal(TTS_CONFIG_KEY, config);
}

/**
 * Build the afChain string for playPortalTts from a saved config.
 * Returns undefined when Apply FFmpeg is off so the server skips post-processing.
 */
export function buildAfChain(cfg: TtsConfig): string | undefined {
  if (!cfg.applyFfmpeg) return undefined;
  const chain = buildFfmpegChain(cfg.fx, { volume: cfg.volume, allowRubberband: cfg.useRubberband });
  return chain || undefined;
}
