"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  X, Loader2, Square, Play, Star, Copy, Check, RotateCcw,
  Plus, Shield, Save, Sliders, Volume2, Activity, Radio, AlertTriangle,
  Repeat, MessageSquare, Wand2, ChevronRight,
} from "lucide-react";
import { readLocal } from "@/lib/storage";
import {
  DEFAULT_TTS_CONFIG,
  TTS_VOICES,
  readTtsConfig,
  writeTtsConfig,
  type TtsConfig,
  type TtsResponseFormat,
} from "@/lib/ttsConfig";
import { playPortalTts, stopPortalTts, type TtsState } from "@/lib/tts";
import {
  DEFAULT_FX,
  FX_CONTROLS,
  PRESET_LIBRARY,
  SAFE_PRESETS,
  REVERB_PRESETS,
  TAP_PLUGINS,
  buildFfmpegChain,
  buildFinalizeChain,
  buildOutputSummary,
  fetchUserPresets,
  saveUserPresets,
  readFavorites,
  writeFavorites,
  type VoiceFx,
  type VoiceFxPreset,
  type ReverbType,
} from "@/lib/voiceFx";

interface TtsConfigModalProps {
  open: boolean;
  onClose: () => void;
}

const FORMAT_OPTIONS: TtsResponseFormat[] = ["mp3", "opus", "aac", "flac", "wav", "pcm"];

let presetSeq = 0;
function newPresetId(): string {
  presetSeq += 1;
  return `user-${presetSeq}-${performance.now().toString(36).replace(".", "")}`;
}

interface LadspaControl {
  index: number;
  name: string;
  min: number | null;
  max: number | null;
  default: number;
  toggled: boolean;
  integer: boolean;
  logarithmic: boolean;
}

/** Parse an FFmpeg ladspa controls string ("c0=50|c1=-3") into an index→value map. */
function parseCtlString(s: string): Record<number, number> {
  const out: Record<number, number> = {};
  for (const m of s.matchAll(/c(\d+)\s*=\s*(-?[\d.]+)/g)) out[Number(m[1])] = Number(m[2]);
  return out;
}

/** Serialize controls back to "c0=..|c1=.." using each control's value or default. */
function serializeCtls(list: LadspaControl[], values: Record<number, number>): string {
  return list.map((c) => `c${c.index}=${values[c.index] ?? c.default}`).join("|");
}

/** Merge a preset's overrides onto a base config. "custom" keeps current FX. */
function applyPreset(base: TtsConfig, preset: VoiceFxPreset): TtsConfig {
  if (preset.id === "custom") return { ...base, preset: "custom" };
  return {
    ...base,
    preset: preset.id,
    voice: preset.voice ?? base.voice,
    instructions: preset.instructions ?? base.instructions,
    speed: preset.apiSpeed ?? base.speed,
    playbackRate: preset.playbackRate ?? base.playbackRate,
    responseFormat: preset.format ?? base.responseFormat,
    volume: preset.volume ?? base.volume,
    fx: { ...DEFAULT_FX, ...preset.fx },
  };
}

export function TtsConfigModal({ open, onClose }: TtsConfigModalProps) {
  // Mount a fresh panel each time the modal opens so config/presets load once
  // via state initializers (no synchronizing effect needed).
  if (!open) return null;
  return <Panel onClose={onClose} />;
}

function Panel({ onClose }: { onClose: () => void }) {
  const [cfg, setCfg] = useState<TtsConfig>(readTtsConfig);
  const [savedSnapshot, setSavedSnapshot] = useState<TtsConfig>(readTtsConfig);
  const [ttsState, setTtsState] = useState<TtsState>("idle");
  const [ttsError, setTtsError] = useState<string | null>(null);
  const [userPresets, setUserPresets] = useState<VoiceFxPreset[]>([]);
  const [favorites, setFavorites] = useState<string[]>(readFavorites);
  const [copied, setCopied] = useState(false);

  // LADSPA control introspection
  const [ladspaCtls, setLadspaCtls] = useState<LadspaControl[]>([]);
  const [ladspaBusy, setLadspaBusy] = useState(false);
  const [ladspaCtlError, setLadspaCtlError] = useState<string | null>(null);

  // A/B compare
  const [abEnabled, setAbEnabled] = useState(false);
  const [slotA, setSlotA] = useState<TtsConfig | null>(null);
  const [slotB, setSlotB] = useState<TtsConfig | null>(null);
  const [activeSlot, setActiveSlot] = useState<"A" | "B">("A");

  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load user presets from the server on mount.
  useEffect(() => { void fetchUserPresets().then(setUserPresets); }, []);

  // Stop any playback and clear timers when the panel unmounts (modal closes).
  useEffect(() => () => {
    stopPortalTts();
    if (copyTimer.current) clearTimeout(copyTimer.current);
  }, []);

  const allPresets = useMemo(() => [...PRESET_LIBRARY, ...userPresets], [userPresets]);

  const chain = useMemo(
    () => buildFfmpegChain(cfg.fx, { volume: cfg.volume, allowRubberband: cfg.useRubberband }),
    [cfg.fx, cfg.volume, cfg.useRubberband]
  );
  const preChain = useMemo(
    () => buildFfmpegChain(cfg.fx, { volume: cfg.volume, allowRubberband: cfg.useRubberband, finalize: false }),
    [cfg.fx, cfg.volume, cfg.useRubberband]
  );
  const finalizeChain = useMemo(() => buildFinalizeChain(cfg.fx, { volume: cfg.volume }), [cfg.fx, cfg.volume]);
  const vstActive = cfg.fx.vstEnabled && cfg.fx.vstPlugin.trim().length > 0;
  const summary = useMemo(() => buildOutputSummary(cfg.fx), [cfg.fx]);
  const isDirty = useMemo(
    () => JSON.stringify(cfg) !== JSON.stringify(savedSnapshot),
    [cfg, savedSnapshot]
  );
  const activePreset = allPresets.find((p) => p.id === cfg.preset);

  // ---- updaters -----------------------------------------------------------
  function patch(p: Partial<TtsConfig>) { setCfg((prev) => ({ ...prev, ...p })); }
  function updateFx<K extends keyof VoiceFx>(key: K, value: VoiceFx[K]) {
    setCfg((prev) => ({ ...prev, fx: { ...prev.fx, [key]: value } }));
  }
  function resetFx<K extends keyof VoiceFx>(key: K) { updateFx(key, DEFAULT_FX[key]); }

  function selectPreset(preset: VoiceFxPreset) { setCfg((prev) => applyPreset(prev, preset)); }

  function resetToPreset() {
    if (!activePreset || activePreset.id === "custom") {
      setCfg((prev) => ({ ...prev, fx: { ...DEFAULT_FX } }));
      return;
    }
    setCfg((prev) => applyPreset(prev, activePreset));
  }

  function saveCurrentAsPreset() {
    const name = window.prompt("Name this preset:", activePreset?.label ?? "My Preset");
    if (!name || !name.trim()) return;
    const newPreset: VoiceFxPreset = {
      id: newPresetId(),
      label: name.trim(),
      description: "Saved preset",
      userDefined: true,
      voice: cfg.voice,
      instructions: cfg.instructions,
      apiSpeed: cfg.speed,
      playbackRate: cfg.playbackRate,
      format: cfg.responseFormat,
      volume: cfg.volume,
      fx: { ...cfg.fx },
    };
    const next = [...userPresets, newPreset];
    setUserPresets(next);
    void saveUserPresets(next).catch(console.error);
    setCfg((prev) => ({ ...prev, preset: newPreset.id }));
  }

  function duplicatePreset(preset: VoiceFxPreset) {
    const merged = applyPreset(cfg, preset);
    const newPreset: VoiceFxPreset = {
      id: newPresetId(),
      label: `${preset.label} Copy`,
      description: "Duplicated preset",
      userDefined: true,
      voice: merged.voice,
      instructions: merged.instructions,
      apiSpeed: merged.speed,
      playbackRate: merged.playbackRate,
      format: merged.responseFormat,
      volume: merged.volume,
      fx: { ...merged.fx },
    };
    const next = [...userPresets, newPreset];
    setUserPresets(next);
    void saveUserPresets(next).catch(console.error);
    setCfg({ ...merged, preset: newPreset.id });
  }

  function deleteUserPreset(id: string) {
    const next = userPresets.filter((p) => p.id !== id);
    setUserPresets(next);
    void saveUserPresets(next).catch(console.error);
    if (cfg.preset === id) patch({ preset: "custom" });
  }

  function toggleFavorite(id: string) {
    const next = favorites.includes(id) ? favorites.filter((f) => f !== id) : [...favorites, id];
    setFavorites(next);
    writeFavorites(next);
  }

  // ---- LADSPA controls ----------------------------------------------------
  function loadLadspaControls() {
    if (!cfg.fx.ladspaPlugin.trim()) {
      setLadspaCtlError("Set a plugin (or pick a TAP plugin) first.");
      return;
    }
    setLadspaBusy(true);
    setLadspaCtlError(null);
    fetch("/api/ladspa/controls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file: cfg.fx.ladspaFile.trim(), plugin: cfg.fx.ladspaPlugin.trim() }),
    })
      .then((r) => r.json())
      .then((d: { ok: boolean; error?: string; controls?: LadspaControl[] }) => {
        if (!d.ok || !d.controls) throw new Error(d.error || "Failed to read controls.");
        setLadspaCtls(d.controls);
        const existing = parseCtlString(cfg.fx.ladspaControls);
        const values: Record<number, number> = {};
        for (const c of d.controls) values[c.index] = existing[c.index] ?? c.default;
        updateFx("ladspaControls", serializeCtls(d.controls, values));
      })
      .catch((e: Error) => setLadspaCtlError(e.message))
      .finally(() => setLadspaBusy(false));
  }
  function setCtlValue(index: number, value: number) {
    const values = parseCtlString(cfg.fx.ladspaControls);
    values[index] = value;
    updateFx("ladspaControls", serializeCtls(ladspaCtls, values));
  }
  function applyTapStarter(t: (typeof TAP_PLUGINS)[number]) {
    if (!t.starter) return;
    updateFx("ladspaFile", t.file);
    updateFx("ladspaPlugin", t.plugin);
    updateFx("ladspaControls", t.starter);
  }

  // ---- transport ----------------------------------------------------------
  function startPlayback() {
    setTtsError(null);
    void playPortalTts({
      text: cfg.testScript || DEFAULT_TTS_CONFIG.testScript,
      voice: cfg.voice,
      instructions: cfg.instructions,
      speed: cfg.speed,
      playbackRate: cfg.playbackRate,
      format: cfg.responseFormat,
      volume: cfg.volume,
      // With a VST insert, send the pre-chain + finalize separately so the
      // plugin runs between them. Otherwise send the full single chain.
      afChain: vstActive ? (cfg.applyFfmpeg ? preChain : undefined) : cfg.applyFfmpeg ? chain : undefined,
      finalizeChain: vstActive ? finalizeChain : undefined,
      vst: vstActive
        ? { plugin: cfg.fx.vstPlugin.trim(), params: cfg.fx.vstParams.trim(), hostPath: cfg.vstHostPath.trim() }
        : undefined,
      onStateChange: setTtsState,
      onError: (msg) => {
        setTtsError(msg);
        setTimeout(() => setTtsError(null), 6000);
      },
    });
  }
  function handleTestToggle() {
    if (ttsState !== "idle") { stopPortalTts(); return; }
    startPlayback();
  }
  function handleStop() { stopPortalTts(); }
  function handleReRender() { stopPortalTts(); setTimeout(startPlayback, 60); }

  function useLastReply() {
    const last = readLocal<string>("tts-last-reply");
    if (last && last.trim()) {
      patch({ testScript: last });
    } else {
      setTtsError("No recent reply found to load.");
      setTimeout(() => setTtsError(null), 4000);
    }
  }

  // ---- save ---------------------------------------------------------------
  function handleSave() {
    writeTtsConfig(cfg);
    setSavedSnapshot(cfg);
    onClose();
  }
  function handleSaveStay() {
    writeTtsConfig(cfg);
    setSavedSnapshot(cfg);
  }

  function copyChain() {
    void navigator.clipboard?.writeText(chain).then(() => {
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 1500);
    });
  }

  // ---- A/B ----------------------------------------------------------------
  function enableAb() { setSlotA(cfg); setSlotB(cfg); setActiveSlot("A"); setAbEnabled(true); }
  function disableAb() { setAbEnabled(false); }
  function selectSlot(s: "A" | "B") {
    const snap = s === "A" ? slotA : slotB;
    if (snap) { setCfg(snap); setActiveSlot(s); }
  }
  function captureSlot(s: "A" | "B") {
    if (s === "A") setSlotA(cfg); else setSlotB(cfg);
    setActiveSlot(s);
  }

  const testBusy = ttsState !== "idle";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />

      <div className="relative z-10 w-full max-w-6xl bg-[#070b14] border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* ===== Header ===== */}
        <div className="shrink-0 border-b border-slate-800/70 bg-gradient-to-r from-[#0a1020] to-[#0a1622]">
          <div className="flex items-start justify-between px-5 py-3.5 gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-cyan-950/60 border border-cyan-700/40 shrink-0">
                <Wand2 className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[0.95rem] font-bold text-slate-100 leading-tight truncate">
                  Chatbot Voice FX Control Panel
                </p>
                <p className="text-[0.72rem] text-slate-500 leading-tight truncate">
                  Tune OpenAI chatbot voice output with optional FFmpeg post-processing
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <MonitoringPill state={ttsState} />
              <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Header control strip */}
          <div className="flex flex-wrap items-center gap-2 px-5 pb-3.5">
            <select
              value={activePreset ? cfg.preset : "custom"}
              onChange={(e) => {
                const p = allPresets.find((x) => x.id === e.target.value);
                if (p) selectPreset(p);
              }}
              className={`${selectCls} max-w-[14rem]`}
              title="Preset"
            >
              {allPresets.map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-900">{p.label}</option>
              ))}
            </select>

            <select
              value={cfg.voice}
              onChange={(e) => patch({ voice: e.target.value })}
              className={`${selectCls} max-w-[9rem]`}
              title="Voice"
            >
              {TTS_VOICES.map((v) => (
                <option key={v} value={v} className="bg-slate-900">{v}</option>
              ))}
            </select>

            <button onClick={handleTestToggle} className={primaryBtn}>
              {ttsState === "loading" ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : ttsState === "playing" ? <Square className="w-3.5 h-3.5 fill-current" />
                : <Play className="w-3.5 h-3.5" />}
              {ttsState === "idle" ? "Test Voice" : ttsState === "loading" ? "Generating…" : "Stop"}
            </button>

            <button
              onClick={() => (abEnabled ? disableAb() : enableAb())}
              className={abEnabled ? toggleBtnOn : toggleBtnOff}
              title="Compare two settings by ear"
            >
              <Repeat className="w-3.5 h-3.5" /> A/B Compare
            </button>

            <button
              onClick={() => selectPreset(SAFE_PRESETS[0])}
              className={ghostBtn}
              title="Apply the low-risk Natural Safe preset"
            >
              <Shield className="w-3.5 h-3.5" /> Safe Preset
            </button>

            <button onClick={saveCurrentAsPreset} className={ghostBtn} title="Save current settings as a named preset">
              <Save className="w-3.5 h-3.5" /> Save Preset
            </button>

            {isDirty && (
              <span className="ml-auto flex items-center gap-1.5 text-[0.7rem] font-semibold text-amber-300">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Unsaved changes
              </span>
            )}
          </div>
        </div>

        {/* ===== Body ===== */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

            {/* ---- Left: Preset Library + Safe ---- */}
            <div className="lg:col-span-3 space-y-4">
              <Card title="Preset Library" icon={<Sliders className="w-3.5 h-3.5" />}>
                <div className="space-y-1.5">
                  {allPresets.filter((p) => p.id !== "custom").map((p) => (
                    <PresetRow
                      key={p.id}
                      preset={p}
                      selected={cfg.preset === p.id}
                      favorite={favorites.includes(p.id)}
                      onSelect={() => selectPreset(p)}
                      onFavorite={() => toggleFavorite(p.id)}
                      onDuplicate={() => duplicatePreset(p)}
                      onReset={() => { selectPreset(p); }}
                      onDelete={p.userDefined ? () => deleteUserPreset(p.id) : undefined}
                    />
                  ))}
                  {/* Custom row */}
                  <PresetRow
                    preset={PRESET_LIBRARY.find((p) => p.id === "custom")!}
                    selected={cfg.preset === "custom"}
                    favorite={favorites.includes("custom")}
                    onSelect={() => selectPreset(PRESET_LIBRARY.find((p) => p.id === "custom")!)}
                    onFavorite={() => toggleFavorite("custom")}
                    onDuplicate={saveCurrentAsPreset}
                    onReset={() => patch({ fx: { ...DEFAULT_FX } })}
                  />
                </div>
                <button onClick={saveCurrentAsPreset} className={`${dashedBtn} mt-2`}>
                  <Plus className="w-3.5 h-3.5" /> Save As New Preset
                </button>
              </Card>

              {/* Safe presets */}
              <div className="rounded-xl border border-emerald-700/40 bg-emerald-950/20 p-3">
                <p className="flex items-center gap-1.5 text-[0.7rem] font-bold uppercase tracking-wider text-emerald-300 mb-2">
                  <Shield className="w-3.5 h-3.5" /> Safe Presets
                </p>
                <div className="space-y-1.5">
                  {SAFE_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => selectPreset(p)}
                      className={`w-full text-left rounded-lg border px-2.5 py-2 transition-colors ${
                        cfg.preset === p.id
                          ? "border-emerald-500/60 bg-emerald-900/30"
                          : "border-emerald-800/40 bg-emerald-950/20 hover:bg-emerald-900/20"
                      }`}
                    >
                      <p className="text-xs font-semibold text-emerald-100">{p.label}</p>
                      <p className="text-[0.65rem] text-emerald-400/80">{p.description}</p>
                    </button>
                  ))}
                </div>
                <p className="mt-2 flex items-start gap-1.5 text-[0.65rem] leading-snug text-amber-300/90">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
                  Use subtle changes. Extreme pitch, reverb, exciter, or EQ settings can make voices sound artificial.
                </p>
              </div>
            </div>

            {/* ---- Middle: Live Test + Core Controls + Advanced ---- */}
            <div className="lg:col-span-6 space-y-4">
              {/* Live Test */}
              <Card title="Live Test" icon={<Activity className="w-3.5 h-3.5" />}>
                {abEnabled && (
                  <div className="mb-3 flex items-center gap-2 rounded-lg border border-cyan-800/40 bg-cyan-950/20 p-1.5">
                    <span className="text-[0.65rem] font-bold uppercase tracking-wider text-cyan-300 px-1">A/B</span>
                    {(["A", "B"] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => selectSlot(s)}
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                          activeSlot === s ? "bg-cyan-600/40 text-cyan-100 border border-cyan-500/50" : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                    <div className="ml-auto flex gap-1.5">
                      <button onClick={() => captureSlot("A")} className={miniBtn}>Capture A</button>
                      <button onClick={() => captureSlot("B")} className={miniBtn}>Capture B</button>
                    </div>
                  </div>
                )}

                <Label>Test Phrase</Label>
                <textarea
                  value={cfg.testScript}
                  onChange={(e) => patch({ testScript: e.target.value })}
                  rows={3}
                  className={textareaCls}
                  placeholder="Text to speak when you test…"
                />

                {/* Transport */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button onClick={startPlayback} disabled={testBusy} className={`${primaryBtn} disabled:opacity-40`}>
                    <Play className="w-3.5 h-3.5" /> Play
                  </button>
                  <button onClick={handleStop} className={ghostBtn}><Square className="w-3.5 h-3.5" /> Stop</button>
                  <button onClick={handleReRender} className={ghostBtn}><Repeat className="w-3.5 h-3.5" /> Re-render</button>
                  <button onClick={useLastReply} className={ghostBtn}><MessageSquare className="w-3.5 h-3.5" /> Use Last Reply</button>
                </div>

                {/* Waveform + meters (placeholders) */}
                <div className="mt-3">
                  <Waveform active={ttsState === "playing"} />
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <LevelMeter label="Input" active={ttsState === "playing"} />
                    <LevelMeter label="Output" active={ttsState === "playing"} />
                  </div>
                  <p className="mt-1 text-[0.6rem] text-slate-600">Waveform &amp; meters are animated placeholders (see notes).</p>
                </div>

                {ttsError && <p className="mt-2 text-xs text-red-400">{ttsError}</p>}

                {/* Output / speed / playback / volume */}
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <Label>Output Format</Label>
                    <select
                      value={cfg.responseFormat}
                      onChange={(e) => patch({ responseFormat: e.target.value as TtsResponseFormat })}
                      className={selectCls}
                    >
                      {FORMAT_OPTIONS.map((f) => <option key={f} value={f} className="bg-slate-900">{f}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label>API Speed</Label>
                    <input type="number" min={0.25} max={4} step={0.05} value={cfg.speed}
                      onChange={(e) => patch({ speed: Number(e.target.value) })} className={inputCls} />
                  </div>
                  <div>
                    <Label>Playback Rate (local)</Label>
                    <input type="number" min={0.5} max={2} step={0.05} value={cfg.playbackRate}
                      onChange={(e) => patch({ playbackRate: Number(e.target.value) })} className={inputCls} />
                  </div>
                  <div>
                    <Label>Volume — {cfg.volume.toFixed(2)}×</Label>
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <input type="range" min={0.1} max={2.0} step={0.05} value={cfg.volume}
                        onChange={(e) => patch({ volume: Number(e.target.value) })} className="w-full accent-cyan-400" />
                    </div>
                  </div>
                </div>
              </Card>

              {/* Core voice controls */}
              <Card title="Core Voice Controls" icon={<Sliders className="w-3.5 h-3.5" />}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                  {FX_CONTROLS.map((c) => (
                    <FxSlider
                      key={c.key}
                      label={c.label}
                      helper={c.helper}
                      min={c.min}
                      max={c.max}
                      step={c.step}
                      value={cfg.fx[c.key]}
                      decimals={c.step < 1 ? 2 : 0}
                      onChange={(v) => updateFx(c.key, v)}
                      onReset={() => resetFx(c.key)}
                    />
                  ))}
                </div>
              </Card>

              {/* Advanced */}
              <Card title="Fine Tune / Advanced" icon={<Sliders className="w-3.5 h-3.5" />}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                  <FxSlider label="Highpass" helper="Removes low rumble" min={20} max={200} step={5} unit="Hz"
                    value={cfg.fx.highpassHz} onChange={(v) => updateFx("highpassHz", v)} onReset={() => resetFx("highpassHz")} />
                  <FxSlider label="Lowpass" helper="Softens harsh top" min={8000} max={20000} step={500} unit="Hz"
                    value={cfg.fx.lowpassHz} onChange={(v) => updateFx("lowpassHz", v)} onReset={() => resetFx("lowpassHz")} />
                  <FxSlider label="EQ Presence Gain" helper="Boost around 3.5 kHz" min={0} max={4} step={0.1} unit="dB" decimals={1}
                    value={cfg.fx.eqPresenceDb} onChange={(v) => updateFx("eqPresenceDb", v)} onReset={() => resetFx("eqPresenceDb")} />
                  <FxSlider label="De-esser" helper="Tames harsh S sounds" min={0} max={10} step={1}
                    value={cfg.fx.deesser} onChange={(v) => updateFx("deesser", v)} onReset={() => resetFx("deesser")} />
                  <FxSlider label="Loudness Target" helper="Integrated LUFS" min={-24} max={-12} step={1} unit="LUFS"
                    value={cfg.fx.loudnessTarget} onChange={(v) => updateFx("loudnessTarget", v)} onReset={() => resetFx("loudnessTarget")} />
                  <FxSlider label="Limiter Ceiling" helper="True-peak ceiling" min={-3} max={-0.5} step={0.1} unit="dB" decimals={1}
                    value={cfg.fx.limiterCeilingDb} onChange={(v) => updateFx("limiterCeilingDb", v)} onReset={() => resetFx("limiterCeilingDb")} />
                  <FxSlider label="Pitch / Tenor" helper="Subtle deeper/brighter" min={0.9} max={1.1} step={0.01} decimals={2}
                    value={cfg.fx.pitch} onChange={(v) => updateFx("pitch", v)} onReset={() => resetFx("pitch")} />
                  <FxSlider label="Tempo" helper="Speed without pitch" min={0.85} max={1.15} step={0.01} decimals={2}
                    value={cfg.fx.tempo} onChange={(v) => updateFx("tempo", v)} onReset={() => resetFx("tempo")} />

                  <div>
                    <Label>Reverb Type</Label>
                    <select value={cfg.fx.reverbType}
                      onChange={(e) => updateFx("reverbType", e.target.value as ReverbType)} className={selectCls}>
                      {REVERB_PRESETS.map((r) => <option key={r.value} value={r.value} className="bg-slate-900">{r.label}</option>)}
                    </select>
                  </div>

                  <div className="flex items-center gap-4 pt-4">
                    <Toggle label="Limiter" checked={cfg.fx.limiterEnabled} onChange={(v) => updateFx("limiterEnabled", v)} />
                    <Toggle label="Rubberband" checked={cfg.useRubberband} onChange={(v) => patch({ useRubberband: v })} />
                  </div>
                </div>

                {/* Instructions live here so they don't dominate the modal */}
                <div className="mt-4">
                  <Label>Instructions (voice performance)</Label>
                  <textarea
                    value={cfg.instructions}
                    onChange={(e) => patch({ instructions: e.target.value })}
                    rows={3}
                    className={textareaCls}
                    placeholder="Describe how the voice should sound and speak…"
                  />
                </div>
              </Card>

              {/* Extended filters (full FFmpeg build) */}
              <Card title="Extended Filters" icon={<Sliders className="w-3.5 h-3.5" />}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                  <FxSlider label="Speech Normalizer" helper="speechnorm — even speech levels" min={0} max={10} step={1}
                    value={cfg.fx.speechNorm} onChange={(v) => updateFx("speechNorm", v)} onReset={() => resetFx("speechNorm")} />
                  <FxSlider label="Exciter / Air" helper="aexciter — adds HF sparkle" min={0} max={10} step={1}
                    value={cfg.fx.exciter} onChange={(v) => updateFx("exciter", v)} onReset={() => resetFx("exciter")} />
                  <FxSlider label="Dynamic De-harsh" helper="adynamicequalizer — tames loud highs" min={0} max={10} step={1}
                    value={cfg.fx.dynEqTame} onChange={(v) => updateFx("dynEqTame", v)} onReset={() => resetFx("dynEqTame")} />
                  <FxSlider label="Stereo Width" helper="stereowiden — stereo output only" min={0} max={10} step={1}
                    value={cfg.fx.stereoWidth} onChange={(v) => updateFx("stereoWidth", v)} onReset={() => resetFx("stereoWidth")} />

                  <div>
                    <Label>Denoise Engine</Label>
                    <select value={cfg.fx.denoiseEngine}
                      onChange={(e) => updateFx("denoiseEngine", e.target.value as VoiceFx["denoiseEngine"])} className={selectCls}>
                      <option value="afftdn" className="bg-slate-900">afftdn (FFT)</option>
                      <option value="arnndn" className="bg-slate-900">arnndn (RNN, needs model)</option>
                    </select>
                  </div>
                  <div className="flex items-center pt-4">
                    <Toggle label="Dynamic Smoothing" checked={cfg.fx.dynamicSmooth} onChange={(v) => updateFx("dynamicSmooth", v)} />
                  </div>

                  {cfg.fx.denoiseEngine === "arnndn" && (
                    <div className="sm:col-span-2">
                      <Label>RNN Model Path (.rnnn)</Label>
                      <input type="text" value={cfg.fx.arnndnModel}
                        onChange={(e) => updateFx("arnndnModel", e.target.value)}
                        placeholder="e.g. C:/models/sh.rnnn (use forward slashes)"
                        className={inputCls} />
                      <p className="text-[0.62rem] text-slate-500 mt-1">
                        Requires an RNNoise model file. The Denoise slider sets the wet/dry mix.
                      </p>
                    </div>
                  )}
                </div>
              </Card>

              {/* External plugins via LADSPA */}
              <Card title="External Plugins — LADSPA (in-chain)" icon={<Wand2 className="w-3.5 h-3.5" />}>
                {/* TAP-plugins quick fill */}
                <div className="mb-3">
                  <Label>TAP Plugin (Tom&apos;s Audio Processing) — quick fill</Label>
                  <select
                    value={TAP_PLUGINS.find((t) => t.plugin === cfg.fx.ladspaPlugin)?.id ?? ""}
                    onChange={(e) => {
                      const t = TAP_PLUGINS.find((x) => x.id === e.target.value);
                      if (t) { updateFx("ladspaFile", t.file); updateFx("ladspaPlugin", t.plugin); }
                    }}
                    className={selectCls}
                  >
                    <option value="" className="bg-slate-900">— Select a TAP plugin —</option>
                    {TAP_PLUGINS.map((t) => (
                      <option key={t.id} value={t.id} className="bg-slate-900">{t.label}</option>
                    ))}
                  </select>
                  {(() => {
                    const t = TAP_PLUGINS.find((x) => x.plugin === cfg.fx.ladspaPlugin);
                    if (!t) return null;
                    return (
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <p className="text-[0.62rem] text-slate-500">{t.starter ? t.starterNote : t.description}</p>
                        {t.starter && (
                          <button onClick={() => applyTapStarter(t)} className={`${miniBtn} shrink-0`}>
                            <Wand2 className="w-3 h-3" /> Voice starter
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label>Library (file)</Label>
                    <input type="text" value={cfg.fx.ladspaFile}
                      onChange={(e) => updateFx("ladspaFile", e.target.value)}
                      placeholder="e.g. tap_reverb" className={inputCls} />
                  </div>
                  <div>
                    <Label>Plugin</Label>
                    <input type="text" value={cfg.fx.ladspaPlugin}
                      onChange={(e) => updateFx("ladspaPlugin", e.target.value)}
                      placeholder="e.g. tap_reverb" className={inputCls} />
                  </div>
                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between">
                      <Label>Controls</Label>
                      <button onClick={loadLadspaControls} disabled={ladspaBusy} className={`${miniBtn} disabled:opacity-40`}>
                        {ladspaBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sliders className="w-3 h-3" />}
                        {ladspaBusy ? "Reading…" : "Load controls"}
                      </button>
                    </div>
                    <input type="text" value={cfg.fx.ladspaControls}
                      onChange={(e) => updateFx("ladspaControls", e.target.value)}
                      placeholder="e.g. c0=2500|c1=0|c2=-6" className={inputCls} />
                  </div>
                </div>

                {ladspaCtlError && (
                  <p className="mt-2 text-[0.66rem] text-red-400">{ladspaCtlError}</p>
                )}

                {ladspaCtls.length > 0 && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5 rounded-lg border border-slate-700/50 bg-slate-900/30 p-2.5">
                    {ladspaCtls.map((c) => {
                      const vals = parseCtlString(cfg.fx.ladspaControls);
                      const val = vals[c.index] ?? c.default;
                      if (c.toggled) {
                        return (
                          <div key={c.index} className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-300 truncate" title={c.name}>{c.name}</span>
                            <Toggle label="" checked={val >= 0.5} onChange={(b) => setCtlValue(c.index, b ? 1 : 0)} />
                          </div>
                        );
                      }
                      const bounded = c.min != null && c.max != null;
                      return (
                        <div key={c.index}>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-slate-300 truncate" title={c.name}>{c.name}</span>
                            <span className="text-[0.7rem] font-mono text-cyan-300 tabular-nums shrink-0">
                              {c.integer ? Math.round(val) : Number(val.toFixed(3))}
                            </span>
                          </div>
                          {bounded ? (
                            <input type="range" min={c.min!} max={c.max!} step={c.integer ? 1 : (c.max! - c.min!) / 200}
                              value={val} onChange={(e) => setCtlValue(c.index, Number(e.target.value))}
                              className="w-full accent-cyan-400 mt-0.5" />
                          ) : (
                            <input type="number" step={c.integer ? 1 : "any"} value={val}
                              onChange={(e) => setCtlValue(c.index, Number(e.target.value))}
                              className={`${inputCls} mt-0.5`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <p className="mt-2 text-[0.62rem] leading-snug text-slate-500">
                  Runs natively in the FFmpeg chain (needs <span className="text-slate-300">Apply FFmpeg</span> on). TAP plugins are bundled in <span className="text-slate-300">resources/ladspa</span> and auto-loaded — once the DLLs are built there, just use the plain name (e.g. <span className="text-slate-300">tap_reverb</span>) and click <span className="text-slate-300">Load controls</span>.
                </p>
              </Card>

              {/* External plugins via VST (MrsWatson offline host) */}
              <Card title="External Plugins — VST (MrsWatson)" icon={<Wand2 className="w-3.5 h-3.5" />}>
                <div className="mb-2 flex items-center justify-between">
                  <Toggle label="Enable VST insert" checked={cfg.fx.vstEnabled} onChange={(v) => updateFx("vstEnabled", v)} />
                  <span className="text-[0.6rem] uppercase tracking-wider text-slate-500">VST2 only · server-side</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <Label>Host Binary (MrsWatson)</Label>
                    <input type="text" value={cfg.vstHostPath}
                      onChange={(e) => patch({ vstHostPath: e.target.value })}
                      placeholder="mrswatson64  (or C:/tools/mrswatson64.exe)" className={inputCls} />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Plugin (.dll path or name)</Label>
                    <input type="text" value={cfg.fx.vstPlugin}
                      onChange={(e) => updateFx("vstPlugin", e.target.value)}
                      placeholder="C:/VST/TDR Nova.dll  (use forward slashes)" className={inputCls} />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Parameters (index,value pairs)</Label>
                    <input type="text" value={cfg.fx.vstParams}
                      onChange={(e) => updateFx("vstParams", e.target.value)}
                      placeholder="0,0.5;1,0.3" className={inputCls} />
                  </div>
                </div>
                <p className="mt-2 flex items-start gap-1.5 text-[0.62rem] leading-snug text-slate-500">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px text-amber-400/80" />
                  FFmpeg can&apos;t host VST — this runs the plugin offline between the FFmpeg pre and finalize stages. Needs MrsWatson installed (VST2 .dll only, no VST3). See notes to install.
                </p>
              </Card>
            </div>

            {/* ---- Right: Chain Preview + Output Summary ---- */}
            <div className="lg:col-span-3 space-y-4">
              <Card title="FFmpeg Chain Preview" icon={<Radio className="w-3.5 h-3.5" />}>
                <div className="flex items-center justify-between mb-2">
                  <Toggle label="Apply FFmpeg" checked={cfg.applyFfmpeg} onChange={(v) => patch({ applyFfmpeg: v })} />
                  <button onClick={copyChain} className={miniBtn}>
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <pre className="text-[0.65rem] leading-relaxed text-cyan-200/90 bg-black/50 border border-slate-800 rounded-lg p-2.5 whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
                  {chain}
                </pre>
                {!cfg.applyFfmpeg && !vstActive && (
                  <p className="mt-1.5 text-[0.62rem] text-slate-500">
                    Preview only. Enable <span className="text-slate-300">Apply FFmpeg</span> to send this chain to the server during tests.
                  </p>
                )}
                {vstActive && (
                  <div className="mt-2 rounded-lg border border-violet-700/40 bg-violet-950/20 p-2">
                    <p className="text-[0.6rem] font-bold uppercase tracking-wider text-violet-300 mb-1">Signal flow (VST active)</p>
                    <p className="text-[0.64rem] leading-snug text-slate-300">
                      OpenAI → {cfg.applyFfmpeg ? "FFmpeg pre" : "decode"} → <span className="text-violet-300">VST: {cfg.fx.vstPlugin.split(/[\\/]/).pop() || "—"}</span> → FFmpeg finalize ({finalizeChain.split(",")[0]}…)
                    </p>
                  </div>
                )}
              </Card>

              <Card title="Output Summary" icon={<ChevronRight className="w-3.5 h-3.5" />}>
                <dl className="space-y-1.5 text-xs">
                  <SummaryRow term="Loudness target" value={summary.loudnessTarget} />
                  <SummaryRow term="Peak ceiling" value={summary.peakCeiling} />
                  <SummaryRow term="Noise reduction" value={summary.noiseReduction} />
                  <SummaryRow term="Reverb type" value={summary.reverb} />
                </dl>
                <div className="mt-3 pt-3 border-t border-slate-800">
                  <p className="text-[0.6rem] font-bold uppercase tracking-wider text-slate-500 mb-1">Processing order</p>
                  <p className="text-[0.66rem] leading-snug text-slate-400">{summary.processingOrder}</p>
                </div>
                <button onClick={resetToPreset} className={`${ghostBtn} mt-3 w-full justify-center`}>
                  <RotateCcw className="w-3.5 h-3.5" /> Reset to preset
                </button>
              </Card>
            </div>
          </div>
        </div>

        {/* ===== Footer ===== */}
        <div className="shrink-0 px-5 py-3 border-t border-slate-800/70 flex items-center justify-between gap-3">
          <span className="text-[0.7rem] text-slate-500">
            {isDirty ? "You have unsaved changes." : "All changes saved."}
          </span>
          <div className="flex items-center gap-3">
            <button onClick={handleSaveStay} className="px-3 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors">
              Apply
            </button>
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} className="px-5 py-2 rounded-xl text-sm font-semibold bg-cyan-600/30 text-cyan-200 border border-cyan-600/40 hover:bg-cyan-600/50 transition-colors">
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// Subcomponents
// ===========================================================================

function Card({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-3.5">
      <h3 className="flex items-center gap-1.5 text-[0.7rem] font-bold uppercase tracking-wider text-cyan-300/90 mb-3">
        {icon}{title}
      </h3>
      {children}
    </section>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[0.62rem] font-extrabold uppercase tracking-widest text-slate-500 mb-1">{children}</p>;
}

function MonitoringPill({ state }: { state: TtsState }) {
  const map = {
    idle: { dot: "bg-slate-500", text: "Idle", cls: "border-slate-700/60 text-slate-400" },
    loading: { dot: "bg-amber-400 animate-pulse", text: "Rendering", cls: "border-amber-700/40 text-amber-300" },
    playing: { dot: "bg-cyan-400 animate-pulse", text: "Live", cls: "border-cyan-700/40 text-cyan-300" },
  }[state];
  return (
    <span className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.66rem] font-semibold ${map.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${map.dot}`} />
      {map.text} Monitoring
    </span>
  );
}

function PresetRow({
  preset, selected, favorite, onSelect, onFavorite, onDuplicate, onReset, onDelete,
}: {
  preset: VoiceFxPreset; selected: boolean; favorite: boolean;
  onSelect: () => void; onFavorite: () => void; onDuplicate: () => void; onReset: () => void; onDelete?: () => void;
}) {
  return (
    <div className={`group rounded-lg border px-2.5 py-2 transition-colors ${
      selected ? "border-cyan-500/60 bg-cyan-950/30" : "border-slate-700/40 bg-slate-900/30 hover:bg-slate-800/40"
    }`}>
      <div className="flex items-center gap-2">
        <button onClick={onSelect} className="flex-1 min-w-0 text-left">
          <p className={`text-xs font-semibold truncate ${selected ? "text-cyan-100" : "text-slate-200"}`}>{preset.label}</p>
          {preset.description && <p className="text-[0.62rem] text-slate-500 truncate">{preset.description}</p>}
        </button>
        <button onClick={onFavorite} title="Favorite" className="shrink-0">
          <Star className={`w-3.5 h-3.5 ${favorite ? "fill-amber-400 text-amber-400" : "text-slate-600 hover:text-slate-400"}`} />
        </button>
      </div>
      <div className="mt-1.5 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onDuplicate} className={tinyLink}>Duplicate</button>
        <button onClick={onReset} className={tinyLink}>Reset</button>
        <button onClick={onDuplicate} className={tinyLink}>Save As</button>
        {onDelete && <button onClick={onDelete} className={`${tinyLink} text-red-400/80 hover:text-red-300`}>Delete</button>}
      </div>
    </div>
  );
}

function FxSlider({
  label, helper, min, max, step, value, onChange, onReset, unit, decimals = 0,
}: {
  label: string; helper?: string; min: number; max: number; step: number;
  value: number; onChange: (v: number) => void; onReset: () => void; unit?: string; decimals?: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-300">{label}</span>
        <div className="flex items-center gap-1.5">
          <span className="text-[0.7rem] font-mono text-cyan-300 tabular-nums">
            {value.toFixed(decimals)}{unit ? ` ${unit}` : ""}
          </span>
          <button onClick={onReset} title="Reset" className="text-slate-600 hover:text-slate-300">
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-cyan-400 mt-1" />
      {helper && <p className="text-[0.62rem] text-slate-500 -mt-0.5">{helper}</p>}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)} className="flex items-center gap-2 group">
      <span className={`relative w-8 h-4.5 rounded-full transition-colors ${checked ? "bg-cyan-500/70" : "bg-slate-700"}`}
        style={{ height: "1.1rem", width: "2rem" }}>
        <span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-transform ${checked ? "translate-x-[0.95rem]" : "translate-x-0.5"}`} />
      </span>
      <span className="text-xs font-semibold text-slate-300">{label}</span>
    </button>
  );
}

function SummaryRow({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-slate-500">{term}</dt>
      <dd className="font-mono text-slate-200 text-right">{value}</dd>
    </div>
  );
}

function Waveform({ active }: { active: boolean }) {
  const bars = 40;
  return (
    <div className="flex items-end justify-between gap-px h-14 rounded-lg border border-slate-800 bg-black/40 px-2 py-1.5">
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className={`flex-1 rounded-sm ${active ? "bg-cyan-400/70 animate-pulse" : "bg-slate-700/60"}`}
          style={{
            height: active ? `${20 + Math.abs(Math.sin(i * 0.7)) * 75}%` : `${15 + Math.abs(Math.sin(i)) * 20}%`,
            animationDelay: `${(i % 8) * 70}ms`,
          }}
        />
      ))}
    </div>
  );
}

function LevelMeter({ label, active }: { label: string; active: boolean }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[0.6rem] uppercase tracking-wider text-slate-500">{label}</span>
        <span className="text-[0.58rem] text-slate-600">placeholder</span>
      </div>
      <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-amber-400 transition-all ${active ? "animate-pulse" : ""}`}
          style={{ width: active ? "72%" : "8%" }}
        />
      </div>
    </div>
  );
}

// ===========================================================================
// Shared class strings
// ===========================================================================

const selectCls =
  "w-full bg-slate-900/70 border border-slate-700/60 text-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500/60 cursor-pointer";
const inputCls =
  "w-full bg-slate-900/70 border border-slate-700/60 text-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500/60";
const textareaCls =
  "w-full bg-slate-900/70 border border-slate-700/60 text-slate-200 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-cyan-500/60 resize-none leading-relaxed";

const primaryBtn =
  "flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold border border-cyan-600/40 bg-cyan-950/40 text-cyan-200 hover:bg-cyan-900/50 transition-colors";
const ghostBtn =
  "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-700/60 bg-slate-900/40 text-slate-300 hover:bg-slate-800/60 transition-colors";
const toggleBtnOff =
  "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-700/60 bg-slate-900/40 text-slate-400 hover:bg-slate-800/60 transition-colors";
const toggleBtnOn =
  "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-cyan-500/50 bg-cyan-600/30 text-cyan-100 transition-colors";
const dashedBtn =
  "flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-lg text-xs font-semibold border border-dashed border-slate-600/60 text-slate-400 hover:text-slate-200 hover:border-slate-500 transition-colors";
const miniBtn =
  "flex items-center gap-1 px-2 py-1 rounded-md text-[0.65rem] font-semibold border border-slate-700/60 bg-slate-900/50 text-slate-300 hover:bg-slate-800/60 transition-colors";
const tinyLink =
  "text-[0.62rem] font-semibold text-slate-400 hover:text-cyan-300 transition-colors";
