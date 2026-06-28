// Voice FX model + FFmpeg mapping for the Chatbot Voice FX Control Panel.
//
// This file is the single source of truth for:
//  - the friendly FX control values (VoiceFx)
//  - control metadata that drives slider rendering (FX_CONTROLS)
//  - the preset library + safe presets (config objects, not JSX)
//  - reverb presets
//  - buildFfmpegChain(): friendly controls -> an FFmpeg "-af" filter chain string
//  - small persistence helpers for user presets + favorites
//
// Rendering logic lives in the component; preset/config data lives here.

import { readLocal, writeLocal } from "./storage";
import type { TtsResponseFormat } from "./ttsConfig";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ReverbType =
  | "none"
  | "tinyRoom"
  | "subtleStudio"
  | "warmRoom"
  | "largerRoom"
  | "impulseResponse";

export interface VoiceFx {
  // Core friendly controls
  warmth: number; // -5..+5
  clarity: number; // -5..+5
  smoothness: number; // 0..10
  brightness: number; // -5..+5
  depth: number; // -5..+5
  speed: number; // 0.85..1.20
  compression: number; // 0..10
  denoise: number; // 0..10
  presence: number; // 0..10
  roomSpace: number; // 0..10

  // Advanced / fine tune
  highpassHz: number; // default 80
  lowpassHz: number; // default 16000
  eqPresenceDb: number; // default ~1.5
  deesser: number; // 0..10
  loudnessTarget: number; // LUFS, default -16
  limiterEnabled: boolean;
  limiterCeilingDb: number; // dBTP, default -1.5
  pitch: number; // multiplier, default 1
  tempo: number; // multiplier, default 1
  reverbType: ReverbType;

  // Extended filters (present in the full FFmpeg build). All default to off.
  denoiseEngine: "afftdn" | "arnndn"; // arnndn = RNN speech denoise (needs a model)
  arnndnModel: string; // path to an .rnnn model file (required for arnndn)
  speechNorm: number; // 0..10 -> speechnorm leveling strength
  exciter: number; // 0..10 -> aexciter high-frequency enhancement
  dynEqTame: number; // 0..10 -> adynamicequalizer dynamic harshness control
  dynamicSmooth: boolean; // adynamicsmooth
  stereoWidth: number; // 0..10 -> stereowiden (stereo output only)
  // External LADSPA plugin insert (FFmpeg `ladspa` filter)
  ladspaFile: string; // library name or full path (LADSPA_PATH-resolved)
  ladspaPlugin: string; // plugin label within the library
  ladspaControls: string; // e.g. "Gain=2|Freq=440"

  // External VST insert via MrsWatson (offline VST2 host, runs as a server step
  // between the FFmpeg pre and finalize stages — not part of the `-af` string)
  vstEnabled: boolean;
  vstPlugin: string; // path to a VST2 .dll (or plugin name on the search path)
  vstParams: string; // "index,value" pairs separated by ; or | e.g. "0,0.5;1,0.3"
}

export const DEFAULT_FX: VoiceFx = {
  warmth: 0,
  clarity: 1,
  smoothness: 3,
  brightness: 0,
  depth: 0,
  speed: 1.0,
  compression: 4,
  denoise: 3,
  presence: 3,
  roomSpace: 0,
  highpassHz: 80,
  lowpassHz: 16000,
  eqPresenceDb: 1.0,
  deesser: 4,
  loudnessTarget: -16,
  limiterEnabled: true,
  limiterCeilingDb: -1.5,
  pitch: 1,
  tempo: 1,
  reverbType: "none",
  denoiseEngine: "afftdn",
  arnndnModel: "",
  speechNorm: 0,
  exciter: 0,
  dynEqTame: 0,
  dynamicSmooth: false,
  stereoWidth: 0,
  ladspaFile: "",
  ladspaPlugin: "",
  ladspaControls: "",
  vstEnabled: false,
  vstPlugin: "",
  vstParams: "",
};

// ---------------------------------------------------------------------------
// Control metadata (drives the core slider grid)
// ---------------------------------------------------------------------------

export interface FxControlMeta {
  key:
    | "warmth"
    | "clarity"
    | "smoothness"
    | "brightness"
    | "depth"
    | "speed"
    | "compression"
    | "denoise"
    | "presence"
    | "roomSpace";
  label: string;
  helper: string;
  min: number;
  max: number;
  step: number;
}

export const FX_CONTROLS: FxControlMeta[] = [
  { key: "warmth", label: "Warmth", helper: "Adds body and thickness", min: -5, max: 5, step: 1 },
  { key: "clarity", label: "Clarity", helper: "Improves articulation", min: -5, max: 5, step: 1 },
  { key: "smoothness", label: "Smoothness", helper: "Reduces harshness", min: 0, max: 10, step: 1 },
  { key: "brightness", label: "Brightness", helper: "Adds high-frequency energy", min: -5, max: 5, step: 1 },
  { key: "depth", label: "Depth", helper: "Adds lower-frequency weight", min: -5, max: 5, step: 1 },
  { key: "speed", label: "Speed", helper: "Speech rate multiplier", min: 0.85, max: 1.2, step: 0.01 },
  { key: "compression", label: "Compression", helper: "Evens loud and quiet parts", min: 0, max: 10, step: 1 },
  { key: "denoise", label: "Denoise", helper: "Reduces background noise", min: 0, max: 10, step: 1 },
  { key: "presence", label: "Presence", helper: "Moves speech forward in the mix", min: 0, max: 10, step: 1 },
  { key: "roomSpace", label: "Room Space", helper: "Adds subtle room ambience", min: 0, max: 10, step: 1 },
];

// ---------------------------------------------------------------------------
// Reverb presets
// ---------------------------------------------------------------------------

export const REVERB_PRESETS: { value: ReverbType; label: string; aecho: string | null }[] = [
  { value: "none", label: "None", aecho: null },
  { value: "tinyRoom", label: "Tiny Room", aecho: "aecho=0.8:0.12:35:0.12" },
  { value: "subtleStudio", label: "Subtle Studio", aecho: "aecho=0.8:0.18:55:0.18" },
  { value: "warmRoom", label: "Warm Room", aecho: "aecho=0.8:0.25:80:0.22" },
  { value: "largerRoom", label: "Larger Room", aecho: "aecho=0.8:0.35:120:0.35" },
  // Impulse-response convolution (afir) needs a separate IR file + filter_complex.
  // Not generated inline here; see buildFfmpegChain + project notes.
  { value: "impulseResponse", label: "Impulse Response (advanced)", aecho: null },
];

// ---------------------------------------------------------------------------
// TAP-plugins catalog (Tom's Audio Processing plugins — LADSPA)
// ---------------------------------------------------------------------------
// These run in-chain via FFmpeg's `ladspa` filter. `file`/`plugin` use the
// standard tap_<name> label (one .so/.dll per plugin). Selecting one fills the
// LADSPA insert fields. Requires the TAP binaries installed + LADSPA_PATH set.

export interface TapPlugin {
  id: string;
  label: string; // display name
  file: string; // ladspa library (f=)
  plugin: string; // ladspa plugin label (p=)
  description: string;
  /** Voice-tuned starter controls (indexed cN=…, partial; rest stay default). */
  starter?: string;
  starterNote?: string;
}

export const TAP_PLUGINS: TapPlugin[] = [
  { id: "tap_autopan", label: "TAP AutoPanner", file: "tap_autopan", plugin: "tap_autopan", description: "LFO auto-panning (stereo)" },
  { id: "tap_chorusflanger", label: "TAP Chorus/Flanger", file: "tap_chorusflanger", plugin: "tap_chorusflanger", description: "Modulated comb filter" },
  { id: "tap_deesser", label: "TAP DeEsser", file: "tap_deesser", plugin: "tap_deesser", description: "Reduces sibilance (S/T)", starter: "c0=-18|c1=6500", starterNote: "Tame sibilance: threshold -18 dB at 6.5 kHz" },
  { id: "tap_doubler", label: "TAP Fractal Doubler", file: "tap_doubler", plugin: "tap_doubler", description: "Thickens a single voice" },
  { id: "tap_dynamics_m", label: "TAP Dynamics (Mono)", file: "tap_dynamics_m", plugin: "tap_dynamics_m", description: "Compressor/limiter/gate" },
  { id: "tap_dynamics_st", label: "TAP Dynamics (Stereo)", file: "tap_dynamics_st", plugin: "tap_dynamics_st", description: "Stereo compressor/limiter/gate" },
  { id: "tap_echo", label: "TAP Echo", file: "tap_echo", plugin: "tap_echo", description: "Stereo echo / delay" },
  { id: "tap_eq", label: "TAP Equalizer", file: "tap_eq", plugin: "tap_eq", description: "8-band parametric EQ" },
  { id: "tap_eqbw", label: "TAP Equalizer/BW", file: "tap_eqbw", plugin: "tap_eqbw", description: "Bandwidth-based parametric EQ" },
  { id: "tap_limiter", label: "TAP Scaling Limiter", file: "tap_limiter", plugin: "tap_limiter", description: "Transparent peak limiter" },
  { id: "tap_pinknoise", label: "TAP Pink/Fractal Noise", file: "tap_pinknoise", plugin: "tap_pinknoise", description: "Noise generator" },
  { id: "tap_pitch", label: "TAP Pitch Shifter", file: "tap_pitch", plugin: "tap_pitch", description: "Formant-aware pitch shift" },
  { id: "tap_reflector", label: "TAP Reflector", file: "tap_reflector", plugin: "tap_reflector", description: "Sci-fi reflection effect" },
  { id: "tap_reverb", label: "TAP Reverberator", file: "tap_reverb", plugin: "tap_reverb", description: "Room / hall reverb", starter: "c0=900|c1=0|c2=-20", starterNote: "Subtle room: 900 ms decay, dry 0 dB, wet -20 dB" },
  { id: "tap_rotspeak", label: "TAP Rotary Speaker", file: "tap_rotspeak", plugin: "tap_rotspeak", description: "Leslie-style rotation" },
  { id: "tap_sigmoid", label: "TAP Sigmoid Booster", file: "tap_sigmoid", plugin: "tap_sigmoid", description: "Soft saturation / loudness" },
  { id: "tap_tremolo", label: "TAP TremoLo", file: "tap_tremolo", plugin: "tap_tremolo", description: "Amplitude modulation" },
  { id: "tap_tubewarmth", label: "TAP TubeWarmth", file: "tap_tubewarmth", plugin: "tap_tubewarmth", description: "Tube / tape saturation", starter: "c0=2.5|c1=4", starterNote: "Gentle warmth: drive 2.5, blend +4 (toward tube)" },
  { id: "tap_vibrato", label: "TAP Vibrato", file: "tap_vibrato", plugin: "tap_vibrato", description: "Pitch modulation" },
];

// ---------------------------------------------------------------------------
// Preset library (config objects)
// ---------------------------------------------------------------------------

export interface VoiceFxPreset {
  id: string;
  label: string;
  description?: string;
  voice?: string;
  instructions?: string;
  apiSpeed?: number;
  playbackRate?: number;
  format?: TtsResponseFormat;
  volume?: number;
  fx: Partial<VoiceFx>;
  /** true for the three low-risk "Safe" presets */
  safe?: boolean;
  /** marks user-created presets persisted in localStorage */
  userDefined?: boolean;
}

export const PRESET_LIBRARY: VoiceFxPreset[] = [
  {
    id: "cleanAssistant",
    label: "Clean Assistant",
    description: "Neutral, low-artifact baseline",
    voice: "marin",
    instructions: "Speak clearly and naturally as a helpful assistant. Neutral, friendly, and easy to follow.",
    fx: {
      warmth: 0, clarity: 1.5, smoothness: 3, brightness: 0, depth: 0,
      compression: 5, denoise: 4, presence: 3, roomSpace: 0,
      highpassHz: 75, lowpassHz: 16000, deesser: 4, loudnessTarget: -16,
      limiterCeilingDb: -1.5, reverbType: "none",
    },
  },
  {
    id: "warmCalm",
    label: "Warm Calm",
    description: "Comfortable warmth, soft top",
    voice: "coral",
    instructions: "Speak in a calm, warm, reassuring tone with smooth pacing and natural pauses.",
    playbackRate: 1.0,
    fx: {
      warmth: 3, clarity: 0, smoothness: 5, brightness: -1, depth: 2,
      compression: 4, denoise: 3, presence: 2, roomSpace: 0,
      highpassHz: 65, lowpassHz: 15000, loudnessTarget: -18, limiterCeilingDb: -2,
      reverbType: "none",
    },
  },
  {
    id: "brightHelpful",
    label: "Bright Helpful",
    description: "Speech-first clarity, crisp top",
    voice: "shimmer",
    instructions: "Speak in a bright, upbeat, articulate, helpful tone. Clear and energetic but not rushed.",
    fx: {
      warmth: 0, clarity: 3, smoothness: 1, brightness: 2, depth: -1,
      compression: 5, denoise: 3, presence: 5, roomSpace: 0,
      highpassHz: 80, lowpassHz: 17000, deesser: 5, loudnessTarget: -16,
      reverbType: "none",
    },
  },
  {
    id: "deeperExecutive",
    label: "Deeper Executive",
    description: "Lower, composed, polished",
    voice: "cedar",
    instructions: "Speak with a low, calm, confident, polished executive tone. Composed and steady.",
    fx: {
      warmth: 2, clarity: 1, smoothness: 4, brightness: -1, depth: 3,
      compression: 6, denoise: 3, presence: 3, roomSpace: 0,
      highpassHz: 65, lowpassHz: 15000, pitch: 0.96, loudnessTarget: -16,
      reverbType: "none",
    },
  },
  {
    id: "lateNightSoft",
    label: "Late Night Soft",
    description: "Slow, soft, soothing",
    voice: "cedar",
    instructions: "Speak softly and slowly with a relaxed, soothing late-night tone.",
    fx: {
      warmth: 2, clarity: -1, smoothness: 7, brightness: -2, depth: 2, speed: 0.97,
      compression: 3, denoise: 2, presence: 1, roomSpace: 1,
      highpassHz: 60, lowpassHz: 13500, pitch: 0.98, tempo: 0.96,
      loudnessTarget: -20, limiterCeilingDb: -2, reverbType: "tinyRoom",
    },
  },
  {
    id: "subtleRoomSpace",
    label: "Subtle Room Space",
    description: "Dry voice + a touch of studio space",
    voice: "marin",
    instructions: "Speak naturally and clearly with a relaxed, professional delivery.",
    fx: {
      warmth: 0, clarity: 1.2, smoothness: 3, brightness: 0, depth: 0,
      compression: 5, denoise: 3, presence: 3, roomSpace: 5,
      highpassHz: 80, lowpassHz: 16000, deesser: 4, loudnessTarget: -16,
      reverbType: "subtleStudio",
    },
  },
  {
    id: "warmRoom",
    label: "Warm Room",
    description: "Warm tone with noticeable room",
    voice: "coral",
    instructions: "Speak with a warm, comfortable, friendly tone and natural pacing.",
    fx: {
      warmth: 2.5, clarity: -0.5, smoothness: 4, brightness: 0, depth: 2,
      compression: 4, denoise: 2, presence: 2, roomSpace: 7,
      highpassHz: 70, lowpassHz: 16000, loudnessTarget: -18, limiterCeilingDb: -2,
      reverbType: "warmRoom",
    },
  },
  {
    id: "custom",
    label: "Custom",
    description: "Your manual settings",
    fx: {},
  },
];

export const SAFE_PRESETS: VoiceFxPreset[] = [
  {
    id: "naturalSafe",
    label: "Natural Safe",
    description: "Low artifact risk · balanced and neutral",
    safe: true,
    instructions: "Speak clearly and naturally as a helpful assistant. Neutral, friendly, and easy to follow.",
    fx: {
      warmth: 0, clarity: 1, smoothness: 3, brightness: 0, depth: 0, speed: 1.0,
      compression: 4, denoise: 3, presence: 2, roomSpace: 0, pitch: 1, tempo: 1,
      highpassHz: 80, lowpassHz: 16000, deesser: 3, loudnessTarget: -16,
      limiterEnabled: true, limiterCeilingDb: -1.5, reverbType: "none",
    },
  },
  {
    id: "warmSafe",
    label: "Warm Safe",
    description: "Comfortable warmth · subtle body",
    safe: true,
    instructions: "Speak in a calm, warm, reassuring tone with smooth pacing and natural pauses.",
    fx: {
      warmth: 2, clarity: 0.5, smoothness: 4, brightness: -0.5, depth: 1, speed: 1.0,
      compression: 4, denoise: 3, presence: 2, roomSpace: 0, pitch: 1, tempo: 1,
      highpassHz: 70, lowpassHz: 15500, deesser: 3, loudnessTarget: -16,
      limiterEnabled: true, limiterCeilingDb: -1.5, reverbType: "none",
    },
  },
  {
    id: "brightSafe",
    label: "Bright Safe",
    description: "Speech-first clarity · crisp but controlled",
    safe: true,
    instructions: "Speak in a bright, articulate, helpful tone. Clear but not harsh.",
    fx: {
      warmth: 0, clarity: 2, smoothness: 2, brightness: 1.5, depth: 0, speed: 1.0,
      compression: 4, denoise: 3, presence: 3, roomSpace: 0, pitch: 1, tempo: 1,
      highpassHz: 80, lowpassHz: 17000, deesser: 4, loudnessTarget: -16,
      limiterEnabled: true, limiterCeilingDb: -1.5, reverbType: "none",
    },
  },
];

// ---------------------------------------------------------------------------
// FFmpeg chain generation
// ---------------------------------------------------------------------------

function round(value: number, decimals = 3): number {
  const f = Math.pow(10, decimals);
  return Math.round(value * f) / f;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Quote/escape a filtergraph option value so full Windows paths (with `:` and
 * `\`) survive the parser, e.g. C:/x/tap.dll -> 'C\:/x/tap.dll'.
 */
export function escFilterValue(v: string): string {
  return "'" + v.replace(/\\/g, "/").replace(/:/g, "\\:").replace(/'/g, "\\'") + "'";
}

/** Build a `ladspa=...` insert from the plugin fields (or null if unset). */
export function buildLadspa(fx: VoiceFx): string | null {
  const file = fx.ladspaFile.trim();
  const plugin = fx.ladspaPlugin.trim();
  const controls = fx.ladspaControls.trim();
  if (!file && !plugin) return null;
  const seg: string[] = [];
  if (file) seg.push(`f=${escFilterValue(file)}`);
  if (plugin) seg.push(`p=${escFilterValue(plugin)}`);
  if (controls) seg.push(`c=${controls}`);
  return `ladspa=${seg.join(":")}`;
}

/** Resolve the active reverb to a single `aecho=...` string (or null). */
export function resolveReverb(fx: VoiceFx): string | null {
  // Impulse-response mode needs a separate IR file + filter_complex, so it is
  // not generated as part of the inline "-af" chain here.
  if (fx.reverbType === "impulseResponse") return null;

  if (fx.reverbType && fx.reverbType !== "none") {
    const preset = REVERB_PRESETS.find((p) => p.value === fx.reverbType);
    if (preset?.aecho) return preset.aecho;
  }

  // No explicit reverb type -> fall back to the Room Space slider bucket.
  const rs = fx.roomSpace;
  if (rs <= 0) return null;
  if (rs <= 3) return "aecho=0.8:0.12:35:0.12";
  if (rs <= 6) return "aecho=0.8:0.18:55:0.18";
  if (rs <= 8) return "aecho=0.8:0.25:80:0.22";
  return "aecho=0.8:0.35:120:0.35";
}

export interface BuildChainOptions {
  /** Master gain trim appended as `volume=`. Omitted when 1. */
  volume?: number;
  /** Use librubberband for pitch/tempo (build-dependent). Falls back to asetrate/atempo. */
  allowRubberband?: boolean;
  /**
   * Append the finalize tail (limiter → loudnorm → volume). Default true.
   * Set false to get the "pre" chain when a VST insert runs before finalize.
   */
  finalize?: boolean;
}

/** The finalize tail: limiter → loudness → master volume. Runs last (after any VST). */
export function buildFinalizeChain(fx: VoiceFx, opts: { volume?: number } = {}): string {
  const volume = opts.volume ?? 1;
  const parts: string[] = [];
  if (fx.limiterEnabled) {
    const limit = round(Math.pow(10, fx.limiterCeilingDb / 20), 3); // dBFS -> linear
    parts.push(`alimiter=limit=${limit}`);
  }
  parts.push(`loudnorm=I=${round(fx.loudnessTarget, 1)}:TP=${round(fx.limiterCeilingDb, 1)}:LRA=10`);
  if (volume !== 1) parts.push(`volume=${round(volume, 2)}`);
  return parts.join(",");
}

/**
 * Convert friendly FX controls into an FFmpeg "-af" filter chain.
 *
 * Order follows the recommended vocal chain:
 *   cleanup -> EQ/tone -> pitch/tempo -> dynamics -> reverb/space -> limiter -> loudness/output
 */
export function buildFfmpegChain(fx: VoiceFx, opts: BuildChainOptions = {}): string {
  const parts: string[] = [];
  const volume = opts.volume ?? 1;
  const allowRubberband = opts.allowRubberband ?? false;

  // 1) Cleanup
  if (fx.highpassHz > 0) parts.push(`highpass=f=${Math.round(fx.highpassHz)}`);
  if (fx.denoiseEngine === "arnndn" && fx.arnndnModel.trim() && fx.denoise > 0) {
    // RNN speech denoise. The model path must be single-quoted AND have its
    // drive-letter colon escaped, e.g. m='C\:/models/sh.rnnn' (verified syntax).
    const model = fx.arnndnModel.trim().replace(/\\/g, "/").replace(/:/g, "\\:");
    parts.push(`arnndn=m='${model}':mix=${round(clamp(fx.denoise / 10, 0.1, 1), 2)}`);
  } else if (fx.denoise > 0) {
    const nr = Math.round(2 + fx.denoise * 1.6); // 0..10 -> ~2..18
    const nf = Math.round(-55 + fx.denoise); // -55..-45
    parts.push(`afftdn=nr=${nr}:nf=${nf}`);
  }
  if (fx.deesser > 0) {
    // deesser's intensity defaults to 0 (no-op); scale it from the slider.
    const i = round(clamp((fx.deesser / 10) * 0.7, 0, 1), 2);
    parts.push(`deesser=i=${i}:m=0.5:f=0.5`);
  }

  // 2) EQ / tone
  if (fx.warmth !== 0) parts.push(`bass=g=${round(fx.warmth * 0.8, 2)}:f=140`);
  if (fx.depth !== 0) parts.push(`equalizer=f=110:t=q:w=1:g=${round(fx.depth * 0.6, 2)}`);

  const presenceGain = fx.clarity + fx.eqPresenceDb - fx.smoothness * 0.15;
  if (Math.abs(presenceGain) >= 0.1) {
    parts.push(`equalizer=f=3500:t=q:w=1:g=${round(presenceGain, 2)}`);
  }
  if (fx.presence > 0) parts.push(`equalizer=f=4200:t=q:w=1:g=${round(fx.presence * 0.25, 2)}`);

  const trebleGain = fx.brightness * 0.6 - fx.smoothness * 0.1;
  if (Math.abs(trebleGain) >= 0.1) parts.push(`treble=g=${round(trebleGain, 2)}:f=7500`);

  // Air / sparkle via harmonic exciter
  if (fx.exciter > 0) {
    parts.push(`aexciter=amount=${round((fx.exciter / 10) * 1.5, 2)}:drive=4:freq=6500`);
  }
  // Dynamic harshness control (cuts a band only when it gets too loud)
  if (fx.dynEqTame > 0) {
    const ratio = round(1 + (fx.dynEqTame / 10) * 3, 2); // 1..4
    parts.push(
      `adynamicequalizer=dfrequency=5500:tfrequency=5500:tqfactor=1.5:mode=cutabove:ratio=${ratio}:range=12:auto=adaptive`
    );
  }

  const lowpass = Math.round(fx.lowpassHz - fx.smoothness * 200);
  if (lowpass > 0 && lowpass <= 19000) parts.push(`lowpass=f=${lowpass}`);

  if (fx.dynamicSmooth) parts.push("adynamicsmooth=sensitivity=2:basefreq=22050");

  // 3) Pitch / tempo
  const finalTempo = clamp(fx.speed * fx.tempo, 0.5, 2);
  if (fx.pitch !== 1) {
    if (allowRubberband) {
      const seg = [`pitch=${round(fx.pitch, 3)}`];
      if (Math.abs(finalTempo - 1) >= 0.001) seg.push(`tempo=${round(finalTempo, 3)}`);
      parts.push(`rubberband=${seg.join(":")}`);
    } else {
      // Pitch shift via sample-rate trick, then compensate duration with atempo.
      parts.push(`asetrate=48000*${round(fx.pitch, 3)}`);
      parts.push("aresample=48000");
      const comp = clamp((1 / fx.pitch) * finalTempo, 0.5, 2);
      if (Math.abs(comp - 1) >= 0.001) parts.push(`atempo=${round(comp, 3)}`);
    }
  } else if (Math.abs(finalTempo - 1) >= 0.001) {
    parts.push(`atempo=${round(finalTempo, 3)}`);
  }

  // 4) Dynamics
  if (fx.speechNorm > 0) {
    const e = round(1 + (fx.speechNorm / 10) * 5, 2); // 1..6 expansion
    const c = round(1 + (fx.speechNorm / 10) * 3, 2); // 1..4 compression
    parts.push(`speechnorm=p=0.95:e=${e}:c=${c}`);
  }
  if (fx.compression > 0) {
    const ratio = round(1.5 + fx.compression * 0.25, 2); // ~1.5..4.0
    const threshold = round(0.25 - fx.compression * 0.012, 3); // ~0.25..0.13
    const makeup = round(1 + fx.compression * 0.07, 2); // ~1.0..1.7
    parts.push(`acompressor=threshold=${threshold}:ratio=${ratio}:attack=15:release=240:makeup=${makeup}`);
  }

  // External LADSPA plugin insert (acts like an outboard effect)
  const ladspa = buildLadspa(fx);
  if (ladspa) parts.push(ladspa);

  // 5) Reverb / space
  const echo = resolveReverb(fx);
  if (echo) parts.push(echo);

  // Stereo widening (only audible on stereo output)
  if (fx.stereoWidth > 0) {
    const feedback = round(0.1 + (fx.stereoWidth / 10) * 0.5, 2);
    const crossfeed = round(0.1 + (fx.stereoWidth / 10) * 0.4, 2);
    parts.push(`stereowiden=delay=20:feedback=${feedback}:crossfeed=${crossfeed}:drymix=0.8`);
  }

  // 6/7) Finalize: limiter → loudness → volume (deferred when a VST runs after)
  if (opts.finalize ?? true) {
    const tail = buildFinalizeChain(fx, { volume });
    if (tail) parts.push(tail);
  }

  return parts.join(",");
}

// ---------------------------------------------------------------------------
// Output summary (for the summary card)
// ---------------------------------------------------------------------------

export interface OutputSummary {
  loudnessTarget: string;
  peakCeiling: string;
  noiseReduction: string;
  reverb: string;
  processingOrder: string;
}

export const PROCESSING_ORDER =
  "cleanup → EQ/tone → pitch/tempo → dynamics → reverb/space → limiter → loudness/output";

export function buildOutputSummary(fx: VoiceFx): OutputSummary {
  const echo = resolveReverb(fx);
  const reverbLabel =
    fx.reverbType !== "none"
      ? REVERB_PRESETS.find((p) => p.value === fx.reverbType)?.label ?? "None"
      : echo
        ? "Room (from Room Space)"
        : "None";

  let noiseReduction = "Off";
  if (fx.denoiseEngine === "arnndn" && fx.arnndnModel.trim() && fx.denoise > 0) {
    noiseReduction = `arnndn (RNN), mix ${round(clamp(fx.denoise / 10, 0.1, 1), 2)}`;
  } else if (fx.denoise > 0) {
    noiseReduction = `afftdn nr=${Math.round(2 + fx.denoise * 1.6)} (level ${fx.denoise}/10)`;
  }

  return {
    loudnessTarget: `${fx.loudnessTarget} LUFS`,
    peakCeiling: `${fx.limiterCeilingDb} dBTP`,
    noiseReduction,
    reverb: reverbLabel,
    processingOrder: PROCESSING_ORDER,
  };
}

// ---------------------------------------------------------------------------
// Persistence: user presets + favorites
// ---------------------------------------------------------------------------

const USER_PRESETS_KEY = "tts-user-presets";
const FAVORITES_KEY = "tts-fav-presets";

export function readUserPresets(): VoiceFxPreset[] {
  const saved = readLocal<VoiceFxPreset[]>(USER_PRESETS_KEY);
  return Array.isArray(saved) ? saved : [];
}

export function writeUserPresets(presets: VoiceFxPreset[]): void {
  writeLocal(USER_PRESETS_KEY, presets);
}

export function readFavorites(): string[] {
  const saved = readLocal<string[]>(FAVORITES_KEY);
  return Array.isArray(saved) ? saved : [];
}

export function writeFavorites(ids: string[]): void {
  writeLocal(FAVORITES_KEY, ids);
}
