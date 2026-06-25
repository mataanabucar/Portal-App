"use client";

import { useEffect, useState } from "react";
import { X, Headphones, Loader2, Square, Play } from "lucide-react";
import { TTS_TONE_PRESETS } from "@/lib/tts";
import {
  DEFAULT_TTS_CONFIG,
  TTS_VOICES,
  readTtsConfig,
  writeTtsConfig,
  type TtsConfig,
  type TtsPresetOption,
  type TtsResponseFormat,
} from "@/lib/ttsConfig";
import { playPortalTts, stopPortalTts, type TtsState } from "@/lib/tts";

interface TtsConfigModalProps {
  open: boolean;
  onClose: () => void;
}

const PRESET_OPTIONS: { value: TtsPresetOption; label: string }[] = [
  { value: "warmExecutive", label: TTS_TONE_PRESETS.warmExecutive.label },
  { value: "calmBriefing", label: TTS_TONE_PRESETS.calmBriefing.label },
  { value: "lateNightExecutive", label: TTS_TONE_PRESETS.lateNightExecutive.label },
  { value: "custom", label: "Custom" },
];

const FORMAT_OPTIONS: TtsResponseFormat[] = ["mp3", "opus", "aac", "flac", "wav", "pcm"];

export function TtsConfigModal({ open, onClose }: TtsConfigModalProps) {
  const [cfg, setCfg] = useState<TtsConfig>(DEFAULT_TTS_CONFIG);
  const [ttsState, setTtsState] = useState<TtsState>("idle");
  const [ttsError, setTtsError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setCfg(readTtsConfig());
      setTtsState("idle");
      setTtsError(null);
    } else {
      stopPortalTts();
    }
  }, [open]);

  function handlePresetChange(preset: TtsPresetOption) {
    if (preset === "custom") {
      setCfg((prev) => ({ ...prev, preset: "custom" }));
    } else {
      const p = TTS_TONE_PRESETS[preset];
      setCfg((prev) => ({
        ...prev,
        preset,
        voice: p.voice,
        instructions: p.instructions,
      }));
    }
  }

  function handleSave() {
    writeTtsConfig(cfg);
    onClose();
  }

  function handleTest() {
    if (ttsState !== "idle") {
      stopPortalTts();
      return;
    }
    setTtsError(null);
    void playPortalTts({
      text: cfg.testScript || DEFAULT_TTS_CONFIG.testScript,
      tonePreset: cfg.preset !== "custom" ? cfg.preset : undefined,
      voice: cfg.voice,
      instructions: cfg.instructions,
      speed: cfg.speed,
      playbackRate: cfg.playbackRate,
      format: cfg.responseFormat,
      onStateChange: setTtsState,
      onError: (msg) => {
        setTtsError(msg);
        setTimeout(() => setTtsError(null), 5000);
      },
    });
  }

  if (!open) return null;

  const isCustom = cfg.preset === "custom";
  const testBusy = ttsState !== "idle";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />

      <div className="relative z-10 w-full max-w-lg bg-[#0a0e1a] border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-teal-950/60 border border-teal-700/40 shrink-0">
              <Headphones className="w-4 h-4 text-teal-400" />
            </div>
            <div>
              <p className="text-[0.7rem] font-semibold tracking-[0.2em] text-teal-400 uppercase">TTS</p>
              <p className="text-sm font-semibold text-slate-200">Speech Settings</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Preset */}
          <Field label="Preset">
            <select
              value={cfg.preset}
              onChange={(e) => handlePresetChange(e.target.value as TtsPresetOption)}
              className={selectCls}
            >
              {PRESET_OPTIONS.map((o) => (
                <option key={o.value} value={o.value} className="bg-slate-900">{o.label}</option>
              ))}
            </select>
          </Field>

          {/* Voice */}
          <Field label="Voice">
            <select
              value={cfg.voice}
              onChange={(e) => setCfg((p) => ({ ...p, voice: e.target.value }))}
              className={selectCls}
            >
              {TTS_VOICES.map((v) => (
                <option key={v} value={v} className="bg-slate-900">{v}</option>
              ))}
            </select>
          </Field>

          {/* Instructions */}
          <Field label={`Instructions${!isCustom ? " (read-only for preset)" : ""}`}>
            <textarea
              value={cfg.instructions}
              onChange={(e) => isCustom && setCfg((p) => ({ ...p, instructions: e.target.value }))}
              readOnly={!isCustom}
              rows={5}
              className={`${textareaCls} ${!isCustom ? "opacity-50 cursor-default" : ""}`}
              placeholder="Describe how the voice should sound and speak…"
            />
          </Field>

          {/* Speed / PlaybackRate / Format */}
          <div className="grid grid-cols-3 gap-3">
            <Field label="Speed (API)">
              <input
                type="number"
                min={0.25}
                max={4}
                step={0.05}
                value={cfg.speed}
                onChange={(e) => setCfg((p) => ({ ...p, speed: Number(e.target.value) }))}
                className={inputCls}
              />
              <p className="text-[0.65rem] text-slate-600 mt-1">0.25 – 4.0</p>
            </Field>
            <Field label="Playback Rate">
              <input
                type="number"
                min={0.5}
                max={2}
                step={0.05}
                value={cfg.playbackRate}
                onChange={(e) => setCfg((p) => ({ ...p, playbackRate: Number(e.target.value) }))}
                className={inputCls}
              />
              <p className="text-[0.65rem] text-slate-600 mt-1">0.5 – 2.0</p>
            </Field>
            <Field label="Format">
              <select
                value={cfg.responseFormat}
                onChange={(e) => setCfg((p) => ({ ...p, responseFormat: e.target.value as TtsResponseFormat }))}
                className={selectCls}
              >
                {FORMAT_OPTIONS.map((f) => (
                  <option key={f} value={f} className="bg-slate-900">{f}</option>
                ))}
              </select>
            </Field>
          </div>

          {/* Test script */}
          <Field label="Test Script">
            <textarea
              value={cfg.testScript}
              onChange={(e) => setCfg((p) => ({ ...p, testScript: e.target.value }))}
              rows={3}
              className={textareaCls}
              placeholder="Text to speak when you click Test…"
            />
          </Field>

          {/* Test button + state */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleTest}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors border ${
                testBusy
                  ? "border-red-600/40 bg-red-950/30 text-red-300 hover:bg-red-900/40"
                  : "border-teal-600/40 bg-teal-950/30 text-teal-300 hover:bg-teal-900/40"
              }`}
            >
              {ttsState === "loading" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : ttsState === "playing" ? (
                <Square className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
              {ttsState === "idle" ? "Test" : ttsState === "loading" ? "Generating..." : "Stop"}
            </button>

            {ttsState === "playing" && (
              <span className="flex items-center gap-1.5 text-xs text-teal-300">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                Playing test audio
              </span>
            )}

            {ttsError && (
              <span className="text-xs text-red-400">{ttsError}</span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-6 py-4 border-t border-slate-800/70 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-teal-600/30 text-teal-300 border border-teal-600/40 hover:bg-teal-600/50 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[0.65rem] font-extrabold uppercase tracking-widest text-slate-500 mb-1.5">{label}</p>
      {children}
    </div>
  );
}

const selectCls =
  "w-full bg-slate-900/70 border border-slate-700/60 text-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-teal-500/60 cursor-pointer";

const inputCls =
  "w-full bg-slate-900/70 border border-slate-700/60 text-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-teal-500/60";

const textareaCls =
  "w-full bg-slate-900/70 border border-slate-700/60 text-slate-200 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-teal-500/60 resize-none leading-relaxed";
