"use client";

/**
 * Microphone cleanup pipeline.
 *
 * Builds a clean mic-input stage that runs BEFORE audio reaches the realtime
 * assistant / STT, so room noise, keyboard clicks, fans, and bumps don't get
 * transmitted (and therefore can't trigger the bot or pollute transcription).
 *
 * Pipeline:
 *   getUserMedia (native echoCancellation / noiseSuppression / autoGainControl)
 *     -> MediaStreamAudioSourceNode
 *     -> AnalyserNode            (RMS volume detection, main thread)
 *     -> GainNode (the gate)     (software noise gate w/ attack/release/hold)
 *     -> MediaStreamAudioDestinationNode  -> processed stream (fed to WebRTC)
 *
 *   Optional parallel branch (only when emitChunks is on):
 *     source -> AudioWorklet (PCM ring buffer w/ pre-roll) -> onAudioChunk
 *
 * The gate is the part that actually suppresses noise on the transmitted audio:
 * while RMS is below threshold the gain is driven toward 0, so the outbound
 * stream is silent and server-side VAD never fires on background noise.
 *
 * This is intentionally a "v1": native cleanup + Web Audio gate + silence
 * detection. It is structured so a smarter detector (WebRTC VAD, Silero,
 * RNNoise, Krisp, ...) can be dropped in later behind the same callbacks.
 */

const DEV = process.env.NODE_ENV !== "production";

export interface MicCleanupSettings {
  // Native getUserMedia constraints (applied when the mic is acquired).
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;

  // Software noise gate / voice-activity detection (tunable live).
  noiseGateThreshold: number; // RMS 0..1; below this is treated as noise/silence
  attackMs: number; // how fast the gate opens once speech is detected
  releaseMs: number; // how fast the gate closes once speech stops
  holdMs: number; // keep the gate open this long after the last loud sample
  minSpeechMs: number; // sound must persist this long to count as speech
  endSilenceMs: number; // silence this long ends the utterance
  maxUtteranceMs: number; // hard cap on a single utterance
  preRollMs: number; // audio kept before speech start (avoids clipped first word)

  // Whether to run the AudioWorklet chunk tap (for STT-style pipelines).
  emitChunks: boolean;
}

export const DEFAULT_MIC_CLEANUP_SETTINGS: MicCleanupSettings = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  noiseGateThreshold: 0.015,
  attackMs: 15,
  releaseMs: 250,
  holdMs: 300,
  minSpeechMs: 250,
  endSilenceMs: 900,
  maxUtteranceMs: 30000,
  preRollMs: 300,
  emitChunks: false,
};

export interface MicCleanupDebug {
  volume: number; // current smoothed RMS (0..1)
  gateOpen: boolean;
  speaking: boolean;
  lastSpeechAt: number | null; // epoch ms of the last detected speech sample
  threshold: number;
  ignoredNoiseCount: number;
}

export interface MicCleanupCallbacks {
  onSpeechStart?: () => void;
  onSpeechEnd?: (durationMs: number) => void;
  /** Raw PCM for a likely-speech chunk (only when emitChunks is enabled). */
  onAudioChunk?: (chunk: Float32Array, sampleRate: number) => void;
  /** Per-frame volume (fires at animation-frame rate). */
  onVolumeChange?: (volume: number, gateOpen: boolean) => void;
  /** Throttled snapshot for debug UIs (~10/sec). */
  onDebug?: (debug: MicCleanupDebug) => void;
  onNoiseIgnored?: (count: number) => void;
  onError?: (error: Error) => void;
}

export interface MicCleanupController {
  start(): Promise<MediaStream>;
  stop(): void;
  mute(): void;
  unmute(): void;
  /** Update tunable settings live. Native constraints apply on next start(). */
  updateSettings(next: Partial<MicCleanupSettings>): void;
  getProcessedStream(): MediaStream | null;
  getDebug(): MicCleanupDebug;
}

// Inline AudioWorklet: keeps a ring buffer of recent PCM frames (pre-roll) and,
// while "speaking", flushes the ring then streams subsequent frames as chunks.
// Inlined as a Blob so there is no separate static file for Next.js to serve.
const CAPTURE_WORKLET_SOURCE = `
class MicCaptureProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.preRollFrames = options.processorOptions.preRollFrames || 0;
    this.ring = [];
    this.ringSamples = 0;
    this.speaking = false;
    this.port.onmessage = (event) => {
      const data = event.data || {};
      if (data.type === "speaking") {
        const wasSpeaking = this.speaking;
        this.speaking = !!data.value;
        if (this.speaking && !wasSpeaking) {
          // Flush pre-roll so the first word isn't lost.
          for (const frame of this.ring) {
            this.port.postMessage({ type: "chunk", data: frame }, [frame.buffer]);
          }
          this.ring = [];
          this.ringSamples = 0;
        } else if (!this.speaking) {
          this.ring = [];
          this.ringSamples = 0;
        }
      } else if (data.type === "preRollFrames") {
        this.preRollFrames = data.value || 0;
      }
    };
  }

  process(inputs) {
    const input = inputs[0];
    if (input && input[0]) {
      const copy = new Float32Array(input[0].length);
      copy.set(input[0]);
      if (this.speaking) {
        this.port.postMessage({ type: "chunk", data: copy }, [copy.buffer]);
      } else {
        // Maintain a rolling pre-roll buffer of the most recent samples.
        this.ring.push(copy);
        this.ringSamples += copy.length;
        while (this.ringSamples > this.preRollFrames && this.ring.length > 0) {
          this.ringSamples -= this.ring.shift().length;
        }
      }
    }
    return true;
  }
}
registerProcessor("mic-capture-processor", MicCaptureProcessor);
`;

export function createMicCleanup(
  callbacks: MicCleanupCallbacks,
  initialSettings: MicCleanupSettings
): MicCleanupController {
  let settings: MicCleanupSettings = { ...initialSettings };

  let rawStream: MediaStream | null = null; // mic source (native cleanup)
  let audioContext: AudioContext | null = null;
  let sourceNode: MediaStreamAudioSourceNode | null = null;
  let analyser: AnalyserNode | null = null;
  let gateGain: GainNode | null = null;
  let destination: MediaStreamAudioDestinationNode | null = null;
  let captureNode: AudioWorkletNode | null = null;
  let silentSink: GainNode | null = null; // keeps the worklet branch pulling audio

  let rafId: number | null = null;
  let timeBuffer: Float32Array<ArrayBuffer> | null = null;

  // Gate / VAD state.
  let smoothedVolume = 0;
  let gateOpen = false;
  let speaking = false;
  let speechCandidateStartAt: number | null = null; // first loud sample of a run
  let speechStartedAt: number | null = null; // confirmed speech start
  let lastLoudAt = 0; // last sample at/above threshold
  let lastSpeechAt: number | null = null;
  let ignoredNoiseCount = 0;
  let lastDebugAt = 0;

  function log(...args: unknown[]) {
    if (DEV) {
      console.debug("[micCleanup]", ...args);
    }
  }

  function buildConstraints(): MediaStreamConstraints {
    return {
      audio: {
        echoCancellation: settings.echoCancellation,
        noiseSuppression: settings.noiseSuppression,
        autoGainControl: settings.autoGainControl,
        channelCount: 1, // mono — the assistant/STT only needs one channel
      },
    };
  }

  async function start(): Promise<MediaStream> {
    rawStream = await navigator.mediaDevices.getUserMedia(buildConstraints());

    const AudioCtor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtor) {
      throw new Error("Web Audio API is not available in this browser.");
    }

    audioContext = new AudioCtor();
    // A context can start "suspended" until a user gesture; resume so the
    // analyser produces real samples (otherwise RMS stays 0 and the gate never
    // opens). start() is always called from a click, so this is permitted.
    void audioContext.resume().catch(() => {});
    sourceNode = audioContext.createMediaStreamSource(rawStream);

    // Analyser taps the cleaned signal BEFORE the gate, so RMS reflects the
    // real input level (not the gated output).
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0;
    timeBuffer = new Float32Array(new ArrayBuffer(analyser.fftSize * 4));

    // The gate. Start closed; the detection loop opens it on speech.
    gateGain = audioContext.createGain();
    gateGain.gain.value = 0;

    destination = audioContext.createMediaStreamDestination();

    // Main path: source -> analyser -> gate -> destination(stream out).
    sourceNode.connect(analyser);
    analyser.connect(gateGain);
    gateGain.connect(destination);

    if (settings.emitChunks && callbacks.onAudioChunk) {
      await setupCaptureWorklet();
    }

    startDetectionLoop();
    log("started", settings);
    return destination.stream;
  }

  async function setupCaptureWorklet() {
    if (!audioContext || !sourceNode) {
      return;
    }
    try {
      const blob = new Blob([CAPTURE_WORKLET_SOURCE], {
        type: "application/javascript",
      });
      const url = URL.createObjectURL(blob);
      await audioContext.audioWorklet.addModule(url);
      URL.revokeObjectURL(url);

      const preRollFrames = Math.ceil(
        (settings.preRollMs / 1000) * audioContext.sampleRate
      );
      captureNode = new AudioWorkletNode(audioContext, "mic-capture-processor", {
        processorOptions: { preRollFrames },
      });
      captureNode.port.onmessage = (event: MessageEvent) => {
        const data = event.data as { type?: string; data?: Float32Array };
        if (data?.type === "chunk" && data.data && audioContext) {
          callbacks.onAudioChunk?.(data.data, audioContext.sampleRate);
        }
      };

      // The worklet needs an output path to keep being pulled by the graph;
      // route it through a muted gain so nothing is audible.
      silentSink = audioContext.createGain();
      silentSink.gain.value = 0;
      sourceNode.connect(captureNode);
      captureNode.connect(silentSink);
      silentSink.connect(audioContext.destination);
    } catch (error) {
      // Chunk capture is optional — never let it break the main pipeline.
      log("worklet setup failed (chunks disabled)", error);
      captureNode = null;
    }
  }

  function startDetectionLoop() {
    const tick = () => {
      if (!analyser || !timeBuffer || !audioContext || !gateGain) {
        return;
      }

      analyser.getFloatTimeDomainData(timeBuffer);

      // RMS = sqrt(mean(sample^2)) — energy of the time-domain frame.
      let sumSquares = 0;
      for (let i = 0; i < timeBuffer.length; i += 1) {
        sumSquares += timeBuffer[i] * timeBuffer[i];
      }
      const rms = Math.sqrt(sumSquares / timeBuffer.length);

      // Light smoothing reduces gate chatter without adding noticeable lag.
      smoothedVolume = smoothedVolume * 0.8 + rms * 0.2;

      const now = performance.now();
      const above = smoothedVolume >= settings.noiseGateThreshold;
      const ctxTime = audioContext.currentTime;

      if (above) {
        lastLoudAt = now;
        openGate(ctxTime);

        if (speechCandidateStartAt === null) {
          speechCandidateStartAt = now;
        }
        // Promote a sustained loud run to a confirmed utterance.
        if (!speaking && now - speechCandidateStartAt >= settings.minSpeechMs) {
          speaking = true;
          speechStartedAt = now;
          lastSpeechAt = now;
          captureNode?.port.postMessage({ type: "speaking", value: true });
          callbacks.onSpeechStart?.();
          log("speech start");
        }
        if (speaking) {
          lastSpeechAt = now;
        }
      } else {
        // A short blip that never became speech is "ignored noise".
        if (speechCandidateStartAt !== null && !speaking) {
          ignoredNoiseCount += 1;
          callbacks.onNoiseIgnored?.(ignoredNoiseCount);
        }
        speechCandidateStartAt = null;

        // Close the gate once the hold window elapses.
        if (gateOpen && now - lastLoudAt >= settings.holdMs) {
          closeGate(ctxTime);
        }
        // End the utterance after enough trailing silence.
        if (speaking && lastSpeechAt !== null && now - lastSpeechAt >= settings.endSilenceMs) {
          endSpeech(now);
        }
      }

      // Hard cap on utterance length.
      if (speaking && speechStartedAt !== null && now - speechStartedAt >= settings.maxUtteranceMs) {
        log("max utterance reached");
        endSpeech(now);
      }

      callbacks.onVolumeChange?.(smoothedVolume, gateOpen);

      // Throttle the richer debug snapshot to ~10/sec.
      if (now - lastDebugAt >= 100) {
        lastDebugAt = now;
        callbacks.onDebug?.(getDebug());
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
  }

  function openGate(ctxTime: number) {
    if (gateOpen || !gateGain) {
      return;
    }
    gateOpen = true;
    // setTargetAtTime gives a smooth exponential ramp (attack).
    gateGain.gain.setTargetAtTime(1, ctxTime, Math.max(settings.attackMs, 1) / 1000);
  }

  function closeGate(ctxTime: number) {
    if (!gateOpen || !gateGain) {
      return;
    }
    gateOpen = false;
    gateGain.gain.setTargetAtTime(0, ctxTime, Math.max(settings.releaseMs, 1) / 1000);
  }

  function endSpeech(now: number) {
    if (!speaking) {
      return;
    }
    const durationMs = speechStartedAt !== null ? now - speechStartedAt : 0;
    speaking = false;
    speechStartedAt = null;
    captureNode?.port.postMessage({ type: "speaking", value: false });
    callbacks.onSpeechEnd?.(durationMs);
    log("speech end", `${Math.round(durationMs)}ms`);
  }

  function mute() {
    rawStream?.getAudioTracks().forEach((track) => {
      track.enabled = false;
    });
  }

  function unmute() {
    rawStream?.getAudioTracks().forEach((track) => {
      track.enabled = true;
    });
  }

  function updateSettings(next: Partial<MicCleanupSettings>) {
    settings = { ...settings, ...next };
    // Keep the worklet's pre-roll length in sync when tuned live.
    if (captureNode && audioContext) {
      captureNode.port.postMessage({
        type: "preRollFrames",
        value: Math.ceil((settings.preRollMs / 1000) * audioContext.sampleRate),
      });
    }
  }

  function getProcessedStream(): MediaStream | null {
    return destination?.stream ?? null;
  }

  function getDebug(): MicCleanupDebug {
    return {
      volume: smoothedVolume,
      gateOpen,
      speaking,
      lastSpeechAt,
      threshold: settings.noiseGateThreshold,
      ignoredNoiseCount,
    };
  }

  function stop() {
    // Cancel the detection loop.
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }

    // Disconnect all audio nodes.
    try {
      sourceNode?.disconnect();
      analyser?.disconnect();
      gateGain?.disconnect();
      captureNode?.disconnect();
      silentSink?.disconnect();
      destination?.disconnect();
    } catch (error) {
      log("node disconnect error", error);
    }

    if (captureNode) {
      captureNode.port.onmessage = null;
      captureNode = null;
    }

    // Stop the processed (outbound) track and the raw mic tracks.
    destination?.stream.getTracks().forEach((track) => track.stop());
    rawStream?.getTracks().forEach((track) => track.stop());

    // Close the AudioContext.
    if (audioContext) {
      void audioContext.close().catch(() => {});
    }

    sourceNode = null;
    analyser = null;
    gateGain = null;
    silentSink = null;
    destination = null;
    rawStream = null;
    audioContext = null;
    timeBuffer = null;

    // Reset state for a clean restart.
    smoothedVolume = 0;
    gateOpen = false;
    speaking = false;
    speechCandidateStartAt = null;
    speechStartedAt = null;
    lastSpeechAt = null;
    ignoredNoiseCount = 0;
    log("stopped");
  }

  return {
    start,
    stop,
    mute,
    unmute,
    updateSettings,
    getProcessedStream,
    getDebug,
  };
}
