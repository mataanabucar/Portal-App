"use client";

// Web Audio approximation of a TTS preset's FFmpeg/LADSPA effect chain, applied
// to the live realtime voice stream.
//
// The realtime assistant's audio arrives over WebRTC straight into the browser,
// so the server-side FFmpeg/LADSPA/VST pipeline can't touch it. This rebuilds a
// *lookalike* chain with Web Audio nodes (filters, compressor, convolution
// reverb, gain). It mirrors the gain math in buildFfmpegChain() where Web Audio
// has an equivalent node; it cannot run the actual tap_reverb/VST binaries, and
// independent pitch/tempo shifting is out of scope for a live stream.

import { type VoiceFx } from "./voiceFx";

export interface RealtimeVoiceFxSettings {
  fx: VoiceFx;
  volume: number;
}

export interface RealtimeFxGraph {
  input: AudioNode;
  output: AudioNode;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function dbToLinear(db: number): number {
  return Math.pow(10, db / 20);
}

function parseLadspaControls(raw: string): Record<string, number> {
  const out: Record<string, number> = {};
  if (typeof raw !== "string" || !raw.trim()) {
    return out;
  }
  for (const part of raw.split("|")) {
    const [key, value] = part.split("=");
    const num = Number.parseFloat(value);
    if (key && Number.isFinite(num)) {
      out[key.trim()] = num;
    }
  }
  return out;
}

interface ReverbSpec {
  decaySeconds: number;
  dry: number;
  wet: number;
}

// Derive a reverb spec from the preset's tap_reverb LADSPA insert when present,
// otherwise from the friendly Room Space / reverb-type controls.
function resolveRealtimeReverb(fx: VoiceFx): ReverbSpec | null {
  if (typeof fx.ladspaPlugin === "string" && fx.ladspaPlugin.trim() === "tap_reverb") {
    const c = parseLadspaControls(fx.ladspaControls);
    // tap_reverb: c0 = decay (ms), c1 = dry (dB), c2 = wet (dB).
    const decayMs = c.c0 ?? 900;
    const dryDb = c.c1 ?? 0;
    const wetDb = c.c2 ?? -20;
    return {
      decaySeconds: clamp(decayMs / 1000, 0.1, 6),
      dry: clamp(dbToLinear(dryDb), 0, 1.5),
      wet: clamp(dbToLinear(wetDb), 0, 1),
    };
  }

  const hasReverbType = fx.reverbType && fx.reverbType !== "none";
  const rs = fx.roomSpace;
  if (!hasReverbType && rs <= 0) {
    return null;
  }

  // Buckets mirror resolveReverb()'s Room Space tiers, expressed as IR decay/wet.
  let decaySeconds = 0.3;
  let wet = 0.12;
  if (rs > 8) {
    decaySeconds = 1.2;
    wet = 0.32;
  } else if (rs > 6) {
    decaySeconds = 0.8;
    wet = 0.24;
  } else if (rs > 3) {
    decaySeconds = 0.5;
    wet = 0.18;
  }
  return { decaySeconds, dry: 1, wet };
}

function buildImpulseResponse(ctx: AudioContext, seconds: number): AudioBuffer {
  const rate = ctx.sampleRate;
  const length = Math.max(1, Math.floor(seconds * rate));
  const buffer = ctx.createBuffer(2, length, rate);
  for (let channel = 0; channel < 2; channel += 1) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < length; i += 1) {
      const t = i / length;
      // White noise with an exponential-ish decay envelope.
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.2);
    }
  }
  return buffer;
}

/**
 * Build a linear FX graph for the realtime voice. Returns the entry/exit nodes;
 * the caller connects a MediaStreamSource into `input` and `output` into the
 * AudioContext destination.
 */
export function createRealtimeFxGraph(
  ctx: AudioContext,
  fx: VoiceFx,
  volume: number
): RealtimeFxGraph {
  const input = ctx.createGain();
  let tail: AudioNode = input;

  const push = (node: AudioNode) => {
    tail.connect(node);
    tail = node;
  };

  // 1) Cleanup band-limiting
  if (fx.highpassHz > 0) {
    const node = ctx.createBiquadFilter();
    node.type = "highpass";
    node.frequency.value = fx.highpassHz;
    push(node);
  }
  const lowpass = Math.round(fx.lowpassHz - fx.smoothness * 200);
  if (lowpass > 0 && lowpass <= 19000) {
    const node = ctx.createBiquadFilter();
    node.type = "lowpass";
    node.frequency.value = lowpass;
    push(node);
  }

  // 2) EQ / tone (mirrors buildFfmpegChain gain math)
  if (fx.warmth !== 0) {
    const node = ctx.createBiquadFilter();
    node.type = "lowshelf";
    node.frequency.value = 140;
    node.gain.value = fx.warmth * 0.8;
    push(node);
  }
  if (fx.depth !== 0) {
    const node = ctx.createBiquadFilter();
    node.type = "peaking";
    node.frequency.value = 110;
    node.Q.value = 1;
    node.gain.value = fx.depth * 0.6;
    push(node);
  }
  const presenceGain = fx.clarity + fx.eqPresenceDb - fx.smoothness * 0.15;
  if (Math.abs(presenceGain) >= 0.1) {
    const node = ctx.createBiquadFilter();
    node.type = "peaking";
    node.frequency.value = 3500;
    node.Q.value = 1;
    node.gain.value = presenceGain;
    push(node);
  }
  if (fx.presence > 0) {
    const node = ctx.createBiquadFilter();
    node.type = "peaking";
    node.frequency.value = 4200;
    node.Q.value = 1;
    node.gain.value = fx.presence * 0.25;
    push(node);
  }
  const trebleGain = fx.brightness * 0.6 - fx.smoothness * 0.1;
  if (Math.abs(trebleGain) >= 0.1) {
    const node = ctx.createBiquadFilter();
    node.type = "highshelf";
    node.frequency.value = 7500;
    node.gain.value = trebleGain;
    push(node);
  }

  // 3) Dynamics (DynamicsCompressorNode has no makeup; fold it into master gain)
  let makeup = 1;
  if (fx.compression > 0) {
    const node = ctx.createDynamicsCompressor();
    const thresholdLinear = 0.25 - fx.compression * 0.012;
    node.threshold.value = clamp(20 * Math.log10(Math.max(thresholdLinear, 0.0001)), -60, 0);
    node.ratio.value = clamp(1.5 + fx.compression * 0.25, 1, 20);
    node.attack.value = 0.015;
    node.release.value = 0.24;
    node.knee.value = 6;
    push(node);
    makeup = 1 + fx.compression * 0.07;
  }

  // 4) Reverb / space (parallel wet/dry around the current tail)
  let preMaster: AudioNode = tail;
  const reverb = resolveRealtimeReverb(fx);
  if (reverb) {
    const dry = ctx.createGain();
    dry.gain.value = reverb.dry;
    const wet = ctx.createGain();
    wet.gain.value = reverb.wet;
    const convolver = ctx.createConvolver();
    convolver.buffer = buildImpulseResponse(ctx, reverb.decaySeconds);

    tail.connect(dry);
    tail.connect(convolver);
    convolver.connect(wet);

    const sum = ctx.createGain();
    dry.connect(sum);
    wet.connect(sum);
    preMaster = sum;
  }

  // 5) Master volume (+ compressor makeup)
  const master = ctx.createGain();
  master.gain.value = (Number.isFinite(volume) ? volume : 1) * makeup;
  preMaster.connect(master);

  return { input, output: master };
}
