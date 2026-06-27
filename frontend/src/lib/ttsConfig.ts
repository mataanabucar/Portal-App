import { readLocal, writeLocal } from "./storage";
import { TTS_TONE_PRESETS, type TonePresetKey } from "./tts";

export type TtsPresetOption = TonePresetKey | "custom";

export type TtsResponseFormat = "mp3" | "opus" | "aac" | "flac" | "wav" | "pcm";

export const TTS_VOICES = ["nova", "shimmer", "coral", "sage", "marin", "cedar", "verse"] as const;
export type TtsVoice = (typeof TTS_VOICES)[number];

export interface TtsConfig {
  preset: TtsPresetOption;
  voice: string;
  instructions: string;
  speed: number;
  playbackRate: number;
  responseFormat: TtsResponseFormat;
  testScript: string;
  volume: number;
}

const TTS_CONFIG_KEY = "tts-config";

export const DEFAULT_TTS_CONFIG: TtsConfig = {
  preset: "warmExecutive",
  voice: TTS_TONE_PRESETS.warmExecutive.voice,
  instructions: TTS_TONE_PRESETS.warmExecutive.instructions,
  speed: 1.0,
  playbackRate: 0.95,
  responseFormat: "mp3",
  volume: 1.0,
  testScript:
    "Good morning. Here is a quick summary of your portal queue for today. All items appear to be on track. Please review the following priorities and take action where needed.",
};

export function readTtsConfig(): TtsConfig {
  const saved = readLocal<Partial<TtsConfig>>(TTS_CONFIG_KEY);
  if (!saved) return DEFAULT_TTS_CONFIG;
  return { ...DEFAULT_TTS_CONFIG, ...saved };
}

export function writeTtsConfig(config: TtsConfig): void {
  writeLocal(TTS_CONFIG_KEY, config);
}
