import express from "express";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { writeFileSync, readFileSync, rmSync, existsSync, appendFileSync, mkdirSync } from "node:fs";
import { join, delimiter, dirname, basename } from "node:path";
import { hostname, tmpdir } from "node:os";
import { createHash, randomBytes } from "node:crypto";
import { buildConfig } from "./config/env.js";
import {
  createAskService,
  createPortalParser,
  createSummarizer
} from "./services/ai/index.js";
import {
  readDashboardCache,
  writeDashboardCache
} from "./services/dashboardCache.js";
import { createPortalService } from "./services/portal/index.js";
import {
  hasTesterConfigOverrides,
  normalizeTesterConfig,
  parseTesterConfigQuery
} from "./services/testerConfig.js";
import { findItemEmail } from "./services/graph/services/itemEmailService.js";
import { createDraftMessage, sendDraftMessage, searchMyMessages, listInboxMessages } from "./services/graph/services/mailService.js";
import { searchRecentChatMessages } from "./services/graph/services/teamsChatService.js";
import { getTokenScopes } from "./services/graph/tokenUtils.js";
import {
  getClientCatalog,
  getCatalogEntry,
  isCatalogEntryEnabled,
  getCatalogEntryMissingScopes,
} from "../graph-tester/catalog/graphTesterCatalog.js";
import { parseCatalogArgs } from "../graph-tester/utils/fieldParsers.js";
import { enrichRecordsWithEmail } from "./services/graph/itemEmailEnricher.js";
import { registerKbDebugRoutes } from "./services/kb/debugRoutes.js";
import { runResearchPipeline } from "./services/sourcebot/researchPipeline.js";
import { createTeamGptAuthService } from "./services/teamgpt/auth.js";
import { buildFriendlyCapabilities } from "./services/graph/assistantCapabilities.js";
import { textBlock } from "./services/orchestrator/responseBlocks.js";
import { appendAssistantConversationLog } from "./services/assistant/conversationLog.js";

const publicDirectory = fileURLToPath(new URL("../../public/", import.meta.url));

// File-backed user TTS presets (shared by the /api/tts/presets endpoints and the
// realtime assistant, which inherits a preset's voice + persona instructions).
const USER_PRESETS_FILE = fileURLToPath(new URL("../../user-data/tts-presets.json", import.meta.url));

// Append-only audit log of emails sent via /api/email/send. Records recipients,
// subject, body size, and attachment metadata — never tokens or secrets.
const EMAIL_SEND_LOG_FILE = fileURLToPath(new URL("../../.local-state/email-send-log.jsonl", import.meta.url));

// Conservative caps for assistant-initiated mail (simple attachments only).
const EMAIL_MAX_RECIPIENTS = 25;
const EMAIL_MAX_SUBJECT_CHARS = 255;
const EMAIL_MAX_BODY_CHARS = 100000;
const EMAIL_MAX_ATTACHMENTS = 5;
const EMAIL_MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024; // Graph "simple" attachment limit
const EMAIL_ADDRESS_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// App-bundled LADSPA plugin folder (resources/ladspa). DLLs placed here travel
// with the app and are auto-discovered by FFmpeg via LADSPA_PATH below.
const bundledLadspaDir = fileURLToPath(new URL("../../resources/ladspa/", import.meta.url));

// Environment for spawned FFmpeg processes: prepend the bundled LADSPA folder to
// any existing LADSPA_PATH so shipped TAP plugins load with zero setup.
function ffmpegEnv() {
  const existing = process.env.LADSPA_PATH;
  return {
    ...process.env,
    LADSPA_PATH: existing ? `${bundledLadspaDir}${delimiter}${existing}` : bundledLadspaDir,
  };
}

// ── TTS ───────────────────────────────────────────────────────────────────────

const TTS_TONE_PRESETS = {
  warmExecutive: {
    voice: "cedar",
    instructions:
      "Speak in a calm, warm, confident, polished voice. Use a slightly lower, relaxed delivery with smooth pacing. Sound professional and composed, with subtle charm, but do not sound flirty, theatrical, exaggerated, or overly casual. Pause naturally between sections and make the content easy to follow.",
  },
  calmBriefing: {
    voice: "marin",
    instructions:
      "Speak like a calm professional briefing. Clear, steady, composed, and easy to follow. Use smooth pacing and natural pauses. Avoid sounding robotic, rushed, dramatic, or overly enthusiastic.",
  },
  lateNightExecutive: {
    voice: "cedar",
    instructions:
      "Speak with a low, relaxed, confident tone. Keep the delivery professional, calm, and subtly charismatic. Use slower pacing and smooth intonation. Do not sound seductive, flirty, or performative.",
  },
};

const TTS_FORMAT_EXT = { mp3: "mp3", wav: "wav", flac: "flac", aac: "aac", opus: "ogg" };

async function applyLoudnorm(inputBuffer, format = "mp3", volume = 1.0) {
  const ext = TTS_FORMAT_EXT[format];
  if (!ext) return inputBuffer; // pcm / unknown — skip
  const id = randomBytes(8).toString("hex");
  const tmpIn = join(tmpdir(), `tts_in_${id}.${ext}`);
  const tmpOut = join(tmpdir(), `tts_out_${id}.${ext}`);
  const volFilter = volume !== 1.0 ? `,volume=${volume}` : "";
  try {
    writeFileSync(tmpIn, inputBuffer);
    await new Promise((resolve, reject) => {
      execFile("ffmpeg", [
        "-i", tmpIn,
        "-filter:a", `loudnorm=I=-16:TP=-1.5:LRA=11${volFilter}`,
        "-y", tmpOut,
      ], { env: ffmpegEnv() }, (err) => (err ? reject(err) : resolve()));
    });
    return readFileSync(tmpOut);
  } finally {
    try { rmSync(tmpIn, { force: true }); } catch {}
    try { rmSync(tmpOut, { force: true }); } catch {}
  }
}

// Whitelist of characters allowed in a client-supplied FFmpeg filter chain.
// execFile passes the chain as a single argv entry (no shell), so this is a
// belt-and-suspenders guard against malformed/abusive input rather than shell
// injection (which is already not possible). Backslash/quote/brackets are
// permitted for filters that take file paths (arnndn, ladspa).
const FFMPEG_CHAIN_RE = /^[a-zA-Z0-9=:,.|*/+\-_ ()'@\\\[\]]+$/;
const FFMPEG_CHAIN_MAX = 2000;

function isSafeFfmpegChain(chain) {
  return (
    typeof chain === "string" &&
    chain.trim().length > 0 &&
    chain.length <= FFMPEG_CHAIN_MAX &&
    FFMPEG_CHAIN_RE.test(chain)
  );
}

// Apply an arbitrary (validated) FFmpeg "-af" filter chain. The client-built
// chain already includes loudnorm/limiter/volume, so we run it verbatim.
async function applyFfmpegChain(inputBuffer, format, chain) {
  const ext = TTS_FORMAT_EXT[format];
  if (!ext) return inputBuffer; // pcm / unknown — skip
  const id = randomBytes(8).toString("hex");
  const tmpIn = join(tmpdir(), `tts_fx_in_${id}.${ext}`);
  const tmpOut = join(tmpdir(), `tts_fx_out_${id}.${ext}`);
  const { chain: runChain, cwd } = prepareLadspaChain(chain);
  try {
    writeFileSync(tmpIn, inputBuffer);
    await new Promise((resolve, reject) => {
      const opts = { env: ffmpegEnv(), ...(cwd ? { cwd } : {}) };
      execFile("ffmpeg", ["-i", tmpIn, "-filter:a", runChain, "-y", tmpOut], opts, (err) =>
        err ? reject(err) : resolve()
      );
    });
    return readFileSync(tmpOut);
  } finally {
    try { rmSync(tmpIn, { force: true }); } catch {}
    try { rmSync(tmpOut, { force: true }); } catch {}
  }
}

// ── VST insert via MrsWatson (offline VST2 host) ────────────────────────────
// Pipeline: OpenAI audio → FFmpeg pre (-af) to WAV → MrsWatson(VST) → FFmpeg
// finalize (-af: limiter/loudnorm/volume) → target format.

function execFileAsync(file, args, opts = {}) {
  return new Promise((resolve, reject) => {
    execFile(file, args, { maxBuffer: 1024 * 1024 * 64, ...opts }, (err, stdout, stderr) =>
      err ? reject(new Error((stderr && stderr.toString().trim()) || err.message)) : resolve()
    );
  });
}

// Decode arbitrary input → 48k stereo WAV, optionally applying a pre `-af` chain.
async function ffmpegDecodeToWav(inputBuffer, inExt, preChain) {
  const id = randomBytes(8).toString("hex");
  const tmpIn = join(tmpdir(), `vst_pre_in_${id}.${inExt || "mp3"}`);
  const tmpOut = join(tmpdir(), `vst_pre_out_${id}.wav`);
  const prepared = preChain ? prepareLadspaChain(preChain) : { chain: null, cwd: null };
  const args = ["-i", tmpIn];
  if (prepared.chain) args.push("-filter:a", prepared.chain);
  args.push("-ar", "48000", "-ac", "2", "-y", tmpOut);
  try {
    writeFileSync(tmpIn, inputBuffer);
    await execFileAsync("ffmpeg", args, { env: ffmpegEnv(), ...(prepared.cwd ? { cwd: prepared.cwd } : {}) });
    return readFileSync(tmpOut);
  } finally {
    try { rmSync(tmpIn, { force: true }); } catch {}
    try { rmSync(tmpOut, { force: true }); } catch {}
  }
}

// Encode WAV → target format, optionally applying a finalize `-af` chain.
async function ffmpegEncodeFromWav(wavBuffer, format, finalizeChain) {
  const ext = TTS_FORMAT_EXT[format] || "wav";
  const id = randomBytes(8).toString("hex");
  const tmpIn = join(tmpdir(), `vst_post_in_${id}.wav`);
  const tmpOut = join(tmpdir(), `vst_post_out_${id}.${ext}`);
  const args = ["-i", tmpIn];
  if (finalizeChain) args.push("-filter:a", finalizeChain);
  args.push("-y", tmpOut);
  try {
    writeFileSync(tmpIn, wavBuffer);
    await execFileAsync("ffmpeg", args, { env: ffmpegEnv() });
    return readFileSync(tmpOut);
  } finally {
    try { rmSync(tmpIn, { force: true }); } catch {}
    try { rmSync(tmpOut, { force: true }); } catch {}
  }
}

// Split a plugin reference into MrsWatson's { name, root }. A full .dll path is
// split into a search root + bare name; a bare name is used as-is.
function parseVstPlugin(ref) {
  const raw = String(ref).trim();
  if (/[\\/]/.test(raw)) {
    const norm = process.platform === "win32" ? raw.replace(/\//g, "\\") : raw.replace(/\\/g, "/");
    return {
      root: dirname(norm),
      name: basename(norm).replace(/\.(dll|vst|so)$/i, ""),
    };
  }
  return { root: null, name: raw.replace(/\.(dll|vst|so)$/i, "") };
}

// "0,0.5;1,0.3" → ["--parameter","0,0.5","--parameter","1,0.3"]
function parseVstParams(spec) {
  if (!spec || typeof spec !== "string") return [];
  return spec
    .split(/[;|]/)
    .map((s) => s.trim())
    .filter((s) => /^\d+\s*,\s*-?\d*\.?\d+$/.test(s))
    .flatMap((s) => ["--parameter", s.replace(/\s+/g, "")]);
}

async function applyMrsWatson(wavBuffer, { hostPath, plugin, params }) {
  const host = (hostPath && String(hostPath).trim()) || "mrswatson64";
  // If a path-like host is given, fail fast with a clear message when missing.
  if (/[\\/]/.test(host) && !existsSync(host)) {
    throw new Error(`MrsWatson host not found at "${host}".`);
  }
  const { root, name } = parseVstPlugin(plugin);
  const id = randomBytes(8).toString("hex");
  const tmpIn = join(tmpdir(), `vst_in_${id}.wav`);
  const tmpOut = join(tmpdir(), `vst_out_${id}.wav`);
  const args = ["--plugin", name, "--input", tmpIn, "--output", tmpOut];
  if (root) args.push("--plugin-root", root);
  args.push(...parseVstParams(params));
  try {
    writeFileSync(tmpIn, wavBuffer);
    await execFileAsync(host, args).catch((err) => {
      if (err.code === "ENOENT" || /ENOENT/.test(err.message)) {
        throw new Error(`MrsWatson host "${host}" is not installed or not on PATH.`);
      }
      throw err;
    });
    if (!existsSync(tmpOut)) throw new Error("MrsWatson produced no output (check plugin path/format).");
    return readFileSync(tmpOut);
  } finally {
    try { rmSync(tmpIn, { force: true }); } catch {}
    try { rmSync(tmpOut, { force: true }); } catch {}
  }
}

// ── LADSPA plugin loading + control introspection ───────────────────────────
// FFmpeg's af_ladspa only treats the `f=` argument as a path when it starts
// with '/' or '.'; a Windows path (C:\..) is otherwise treated as a plugin
// NAME and searched on LADSPA_PATH (split on ':', appending '.so') — which is
// broken for Windows .dll. The portable fix: run ffmpeg with cwd = the plugin's
// directory and reference it as a relative './name.dll'.

// Resolve a LADSPA file reference to { dir, fArg } for the './name' load form.
// A bare name resolves to the app's bundled resources/ladspa folder.
function resolveLadspaTarget(file) {
  const f = String(file || "").trim();
  if (!/[\\/]/.test(f)) {
    const base = /\.(dll|so)$/i.test(f) ? f : `${f}.dll`;
    return { dir: bundledLadspaDir, fArg: `./${base}` };
  }
  const norm = f.replace(/\\/g, "/");
  return { dir: dirname(norm), fArg: `./${basename(norm)}` };
}

// Rewrite bare `ladspa=f=<name>` references in a chain to the relative './name.dll'
// form and return the cwd ffmpeg must run in. Bare names only (paths left alone).
function prepareLadspaChain(chain) {
  let cwd = null;
  const out = chain.replace(/ladspa=f=([A-Za-z0-9_.\-]+)(?=:|,|$)/g, (m, file) => {
    const t = resolveLadspaTarget(file);
    if (!existsSync(join(t.dir, t.fArg.replace(/^\.\//, "")))) return m;
    if (!cwd) cwd = t.dir;
    return `ladspa=f=${t.fArg}`;
  });
  return { chain: out, cwd };
}

// FFmpeg (af_ladspa) prints lines like:
//   [Parsed_ladspa_0 @ 0x..] c0: Decay [ms] [<float>, min: 0.0, max: 10000.0 (default 2500.0)]
//   [Parsed_ladspa_0 @ 0x..] c3: Comb Filters [toggled (1 or 0) (default 1.0)]
//   [Parsed_ladspa_0 @ 0x..] c7: Reverb Type [<int>, min: 0.0, max: 42.0 (default 0.0)]
// Note the port name itself may contain brackets, so we locate the hint bracket
// (the one containing a type token) rather than the first bracket on the line.
function parseLadspaControls(stderr) {
  const out = [];
  const seen = new Set();
  const hintRe = /\[([^\]]*(?:<float>|<int>|toggled)[^\]]*)\]/;
  const toNum = (s) => {
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  };
  for (const line of stderr.split(/\r?\n/)) {
    const cm = /c(\d+):\s*(.*)$/.exec(line);
    if (!cm) continue;
    const index = Number(cm[1]);
    if (seen.has(index)) continue;
    const rest = cm[2];
    const hm = hintRe.exec(rest);
    if (!hm) continue;
    seen.add(index);
    const body = hm[1];
    const toggled = /toggled/i.test(body);
    const minM = /min:\s*(-?[\d.eE+]+)/i.exec(body);
    const maxM = /max:\s*(-?[\d.eE+]+)/i.exec(body);
    const defM = /default\s+(-?[\d.eE+]+)/i.exec(body);
    out.push({
      index,
      name: rest.slice(0, hm.index).trim(),
      min: toggled ? 0 : minM ? toNum(minM[1]) : null,
      max: toggled ? 1 : maxM ? toNum(maxM[1]) : null,
      default: defM ? toNum(defM[1]) ?? 0 : 0,
      toggled,
      integer: /<int>/i.test(body),
      logarithmic: /logarithmic/i.test(body),
    });
  }
  return out.sort((a, b) => a.index - b.index);
}

async function introspectLadspa(file, plugin) {
  // `c=help` makes af_ladspa print its input controls; run from the plugin's
  // dir with a relative './name.dll' so the win32 loader accepts it.
  const { dir, fArg } = resolveLadspaTarget(file);
  const filter = `ladspa=f=${fArg}:p=${plugin}:c=help`;
  const args = [
    "-hide_banner", "-v", "info",
    "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo", "-t", "0.1",
    "-af", filter, "-f", "null", "-",
  ];
  const stderr = await new Promise((resolve) => {
    execFile("ffmpeg", args, { maxBuffer: 1024 * 1024 * 8, env: ffmpegEnv(), cwd: dir }, (_err, _stdout, serr) =>
      resolve(serr ? String(serr) : "")
    );
  });
  const controls = parseLadspaControls(stderr);
  if (controls.length === 0) {
    if (/does not have any input controls/i.test(stderr)) return [];
    const failed = /Failed to load '([^']+)'/.exec(stderr);
    if (failed) {
      throw new Error(
        `Failed to load '${failed[1]}'. Build the 64-bit DLL into resources/ladspa ` +
          `(this FFmpeg is x86-64) or give a full path to the .dll.`
      );
    }
    throw new Error(`Could not read controls for '${plugin}' — is the DLL built in resources/ladspa?`);
  }
  return controls;
}

function isValidVstRequest(vst) {
  return (
    vst &&
    typeof vst === "object" &&
    typeof vst.plugin === "string" &&
    vst.plugin.trim().length > 0 &&
    vst.plugin.length < 1024 &&
    !/[\r\n\0]/.test(vst.plugin) &&
    (vst.params == null || (typeof vst.params === "string" && vst.params.length < 1024)) &&
    (vst.hostPath == null || (typeof vst.hostPath === "string" && vst.hostPath.length < 1024))
  );
}

const TTS_MAX_CHARS = 6000;
const TTS_CACHE_MAX = 50;
const VOICE_REPLAY_CONTEXT_MAX_CHARS = 14000;
const VOICE_REPLAY_SCRIPT_MAX_CHARS = 4500;
const REALTIME_MAX_OUTPUT_TOKENS_LIMIT = 4096;
const REALTIME_MAX_OFFER_SDP_CHARS = 100 * 1024;
const MATAAN_PRONUNCIATION_RULE =
  'When saying Mataan aloud, always pronounce his name as "muh-TAWN". Keep the normal spelling "Mataan" in visible text unless he explicitly asks for phonetic spelling.';
const ttsCache = new Map();

function cleanTtsText(text) {
  return text
    .replace(/<[^>]+>/g, " ")
    .replace(/[#*_`~[\]]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, TTS_MAX_CHARS);
}

function appendMataanPronunciationRule(instructions) {
  const normalized =
    typeof instructions === "string" ? instructions.replace(/\s+/g, " ").trim() : "";
  if (!normalized) {
    return MATAAN_PRONUNCIATION_RULE;
  }
  if (normalized.includes(MATAAN_PRONUNCIATION_RULE)) {
    return normalized;
  }
  return `${normalized} ${MATAAN_PRONUNCIATION_RULE}`;
}

function ttsSetCache(key, buffer) {
  if (ttsCache.size >= TTS_CACHE_MAX) {
    ttsCache.delete(ttsCache.keys().next().value);
  }
  ttsCache.set(key, buffer);
}

function buildTtsCacheKey({
  voice,
  format,
  speed,
  volume,
  afChain,
  finalizeChain,
  vst,
  instructions,
  text,
}) {
  // Hash the full effective request so late-chain controls (for example LADSPA
  // cN values) cannot collide with an older cached render.
  return createHash("sha256")
    .update(
      JSON.stringify({
        voice,
        format,
        speed,
        volume,
        afChain,
        finalizeChain,
        vst,
        instructions,
        text,
      })
    )
    .digest("hex");
}

function buildVoiceReplayPrompt(reportText, cardJson) {
  return [
    "Rewrite the report below into a what i need to know, clear, friendly summary in a flirty \"you know me\" girlfriend tone.",
    "",
    "Tone rules:",
    "",
    "Call me Mataan by default.",
    'When using my name, keep the spelling "Mataan" but treat its spoken pronunciation as "muh-TAWN".',
    "Use babe only for light encouragement or reassurance.",
    "Keep it sexy-friendly, playful, warm, and personal, but still work-appropriate.",
    "Make it sound like a smart girlfriend helping me understand what matters.",
    "Do not make it vulgar, explicit, cringey, or overly dramatic.",
    "Keep the business details accurate.",
    "Make the summary easy to scan.",
    "Highlight what needs to happen next, why it matters, due date, risk, and key request details.",
    "Use plain language a non-developer can understand.",
    "Keep it concise but useful.",
    "",
    "Report below:",
    reportText,
    "",
    "Full card JSON for context. Use this to preserve any details the report text missed:",
    cardJson,
  ].join("\n");
}

function buildRealtimeAssistantInstructions(hasPersona = false) {
  const lines = [
    "You are Mataan's realtime AI work assistant, embedded in his portal dashboard.",
    "You are a fully capable AI assistant with broad general knowledge and strong reasoning.",
    'Whenever you say Mataan\'s name aloud, pronounce it "muh-TAWN". Keep the normal spelling "Mataan" in text unless he asks for phonetics.',
    "Use that knowledge freely: explain concepts, help debug code and errors, brainstorm, draft and rewrite text, do analysis, and reason through problems like a sharp, knowledgeable colleague.",
    "Never claim you lack knowledge or can 'only use portal tools' — you have full general knowledge in addition to the live portal context and tools.",
    "On top of that, you have live access to Mataan's portal work queue: the dashboard context provided to you in this session, plus read-only tools (get_queue_snapshot, refresh_queue, research_item, get_item_email_context, ask_portal_question, orchestrate_assistant_request, search_docs).",
    "You can independently access Mataan's Microsoft 365: use search_emails for keyword/phrase Outlook searches, get_recent_emails for his latest/newest/most-recent messages (date-ordered, no keyword needed — use this for 'what's my last email'), and search_chats for Teams chat messages by keyword, person, or topic. These tools reach his entire mailbox and Teams history directly via Microsoft Graph and are COMPLETELY INDEPENDENT of the portal work queue — use them whenever he asks to find, recall, or look up an email or chat, even when it has nothing to do with the portal. Never tie an email or chat lookup to the portal queue unless he explicitly asks about a specific portal item. Summarize the hits (sender, date, subject/snippet) rather than guessing.",
    "Beyond those shortcuts, you have FULL Microsoft 365 access through the generic Graph tools: call list_graph_functions to discover every mail, calendar, Teams chat/channel, To Do task, OneNote, contact, and profile function his signed-in account currently supports (with the argument fields each one needs), then call run_graph_function to execute one. Use these for anything the shortcut tools cannot do — calendar events, task lists, moving/replying to mail, chat messages, and so on.",
    "run_graph_function safety: read-only functions may be called freely. Functions marked mutation: true change live Microsoft 365 data — before running one, state exactly what will change (recipients, subject, event time, task, etc.), get Mataan's explicit yes, and only then retry with confirmMutation: true. Never set confirmMutation on your own initiative, and never auto-send anything.",
    "Use the dashboard context and the portal queue tools (get_queue_snapshot, refresh_queue, research_item, get_item_email_context, ask_portal_question) ONLY when a question is about his specific portal queue items — their statuses, due dates, blockers, research findings, or an individual item's email context. Do not route general email or chat searches through the portal.",
    "For internal documentation and company/project structure questions, call orchestrate_assistant_request — it routes through the org Knowledge Base (Genny Studio), code search, and Mataan's uploaded reference docs. This covers: how his systems work (ATS, calendar, audits — architecture, schemas, workflows), org charts, team and group rosters, Super Groups (e.g. \"Super Group A\"), who reports to whom, scopes, and policies. Never answer those from your own general knowledge, never say you lack access to his documentation, and never use the Microsoft Graph tools for them — Super Groups and org-chart teams are NOT Microsoft 365 groups. Prefer orchestrate_assistant_request over search_docs (the legacy local docs index may be disabled).",
    "When Mataan asks for a flow chart, workflow, or diagram of something internal, first fetch the facts via orchestrate_assistant_request, then describe the flow concisely aloud — the full answer (including any diagrams) appears in his dashboard UI.",
    "Grounding rule applies ONLY to portal-specific facts (a particular item's status, ID, owner, due date, blockers, research results): rely on the provided context or a tool rather than guessing, and if you don't have it, say so or offer to fetch it.",
    "For everything else — general knowledge, explanations, debugging, advice, drafting — just answer directly from your own expertise.",
    "When it matters, distinguish confirmed portal facts from your own assumptions or suggestions.",
    "Keep spoken answers concise unless asked for more detail.",
    "Ask for a brief confirmation before refreshing the queue or any other state-changing action.",
    "Treat Benchmark and client data as private, and never reveal secrets, cookies, tokens, auth headers, or credentials.",
  ];

  // Only impose the default tone when no persona preset is governing delivery;
  // otherwise the persona below owns tone/personality.
  if (!hasPersona) {
    lines.push("Be professional, direct, and lightly conversational.");
  }

  return lines.join(" ");
}

const REALTIME_EMPTY_TOOL_PARAMETERS = {
  type: "object",
  properties: {},
  additionalProperties: false,
};

const REALTIME_TOOLS = [
  {
    type: "function",
    name: "get_queue_snapshot",
    description:
      "Get a compact snapshot of the current dashboard queue, including item titles, status, priority, due dates, and next actions.",
    parameters: REALTIME_EMPTY_TOOL_PARAMETERS,
  },
  {
    type: "function",
    name: "refresh_queue",
    description:
      "Refresh the dashboard queue. Only call this after the user explicitly asks to refresh, reload, or re-check the queue.",
    parameters: REALTIME_EMPTY_TOOL_PARAMETERS,
  },
  {
    type: "function",
    name: "research_item",
    description:
      "Research one queue item by title or ID and answer a focused question using the existing portal research pipeline.",
    parameters: {
      type: "object",
      properties: {
        itemTitleOrId: {
          type: "string",
          description: "The queue item title, request ID, or related action item.",
        },
        question: {
          type: "string",
          description: "The focused research question to investigate.",
        },
      },
      required: ["itemTitleOrId", "question"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "get_item_email_context",
    description:
      "Look up the most relevant email context for an item by request ID or related action item.",
    parameters: {
      type: "object",
      properties: {
        requestId: {
          type: "string",
          description: "The Request ID shown on the queue item.",
        },
        relatedActionItem: {
          type: "string",
          description: "The Related Action Item shown on the queue item.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "ask_portal_question",
    description:
      "Ask a concise portal question that can be answered from the current queue context without running deeper research.",
    parameters: {
      type: "object",
      properties: {
        question: {
          type: "string",
          description: "The question to answer.",
        },
        itemContext: {
          type: "string",
          description:
            "Optional item-specific context to include with the question.",
        },
      },
      required: ["question"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "search_docs",
    description:
      "Search Mataan's documentation knowledge base (ATS and calendar system architecture, database schemas, table relationships, and backend/frontend design docs) for relevant excerpts. Use this for questions about how those systems are built or work.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "What to look up in the documentation.",
        },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "send_email",
    description:
      'Compose an email and stage it for Mataan to review. This does NOT send immediately: it prepares the message and Mataan must explicitly confirm it before it is sent via Microsoft Graph. The current confirmation methods are saying "yes send it now" or confirming it in the portal UI. Use this only when Mataan asks to send or draft an email. Always read the recipients and subject back to him before calling this.',
    parameters: {
      type: "object",
      properties: {
        to: {
          type: "array",
          items: { type: "string" },
          description: "Recipient email addresses (the To line). At least one is required.",
        },
        subject: {
          type: "string",
          description: "The email subject line.",
        },
        body: {
          type: "string",
          description: "The plain-text body of the email.",
        },
        cc: {
          type: "array",
          items: { type: "string" },
          description: "Optional CC email addresses.",
        },
      },
      required: ["to", "subject", "body"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "search_emails",
    description:
      "Search Mataan's Outlook mailbox by keyword or phrase and return matching messages (subject, sender, date, snippet). Use this when he asks to find, recall, or look up an email, or what someone sent about a topic. Read-only.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Keywords, sender name, or phrase to search the mailbox for.",
        },
        limit: {
          type: "number",
          description: "Maximum number of results (default 10, max 25).",
        },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "get_recent_emails",
    description:
      "List Mataan's most recent Outlook emails in date order (newest first) with sender, date, subject, read state, and a snippet. Use this for time-based questions — his latest, newest, last, or most recent email(s), or 'what just came in' / 'any new mail' — where there is no keyword to search. For 'the last email' use limit 1. Read-only, and independent of the portal queue.",
    parameters: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "How many recent messages to return (default 10, max 25). Use 1 for the single latest email.",
        },
      },
      required: [],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "search_chats",
    description:
      "Search Mataan's recent Microsoft Teams chat messages by keyword or phrase and return matching messages (sender, date, snippet). Covers recent messages across his most active chats, not full history. Use this when he asks to find or recall something said in Teams chats. Read-only.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Keywords, person, or phrase to search Teams chats for.",
        },
        limit: {
          type: "number",
          description: "Maximum number of results (default 10, max 25).",
        },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "list_graph_functions",
    description:
      "List every Microsoft 365 (Graph) function Mataan's signed-in account currently supports — mail (own + shared mailboxes), calendar, Teams chats and channel posts, To Do tasks, OneNote, contacts, mailbox settings, files, and profile. Returns each function's name, description, whether it mutates data, and the argument fields it takes. Call this first when run_graph_function is needed and the exact function name or arguments are unclear.",
    parameters: {
      type: "object",
      properties: {
        service: {
          type: "string",
          description:
            "Optional service filter: user, calendar, mail, mailboxSettings, teamsChat, teamsChannel, people, tasks, onenote, contacts, files, calendarShared, mailShared, profile.",
        },
        search: {
          type: "string",
          description: "Optional keyword to filter functions by name or description.",
        },
      },
      required: [],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "run_graph_function",
    description:
      "Run any Microsoft Graph function returned by list_graph_functions, using Mataan's signed-in Microsoft 365 account. Read-only functions can be run freely. Functions marked mutation: true CHANGE LIVE DATA (send/reply/move/delete mail, create/update events, post chat or channel messages, create/complete tasks): first tell Mataan exactly what will change and get his explicit yes, then retry with confirmMutation set to true. The server rejects mutations without that flag.",
    parameters: {
      type: "object",
      properties: {
        service: {
          type: "string",
          description: "The service key from list_graph_functions (e.g. mail, calendar, tasks).",
        },
        functionName: {
          type: "string",
          description: "The functionName from list_graph_functions (e.g. listEvents, sendMail, completeTask).",
        },
        args: {
          type: "object",
          description:
            "Arguments for the function, matching the fields list_graph_functions reported (JSON fields take objects, others take strings/numbers/booleans).",
          additionalProperties: true,
        },
        confirmMutation: {
          type: "boolean",
          description:
            "Set true ONLY after Mataan explicitly confirmed a mutating function out loud. Leave false otherwise.",
        },
      },
      required: ["service", "functionName"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "orchestrate_assistant_request",
    description:
      "Answer a general question through the portal's deterministic orchestrator: internal documentation/KB (Genny Studio), code/repo search, summaries and action-item extraction, read-only Microsoft 365 lookups, or item research. Prefer this over ask_portal_question for documentation, policy, code, or 'how does X work' questions. Returns a concise speakable answer; richer blocks/sources go to the UI as metadata.",
    parameters: {
      type: "object",
      properties: {
        question: {
          type: "string",
          description: "The user's question, phrased completely and self-contained.",
        },
        context: {
          type: "string",
          description: "Optional extra context (item details, a prior answer being referenced).",
        },
      },
      required: ["question"],
      additionalProperties: false,
    },
  },
];

// Voices accepted by the OpenAI realtime API. Preset voices outside this set
// (e.g. TTS-only voices) fall back to the configured default.
const REALTIME_VOICES = new Set([
  "alloy", "ash", "ballad", "coral", "echo", "sage", "shimmer", "verse", "marin", "cedar",
]);

const REALTIME_PERSONA_MAX_CHARS = 4000;

function buildRealtimeSessionConfig(config, overrides = {}) {
  const session = {
    type: "realtime",
    model: normalizeRealtimeModel(config.openAiRealtimeModel),
    instructions: buildRealtimeInstructions(overrides.instructions),
    output_modalities: ["audio"],
    audio: {
      input: buildRealtimeAudioInput(config),
      output: {
        voice: resolveRealtimeVoice(overrides.voice, config.openAiRealtimeVoice),
      },
    },
    tools: REALTIME_TOOLS,
    tool_choice: "auto",
    max_output_tokens: normalizeRealtimeMaxOutputTokens(
      config.openAiRealtimeMaxOutputTokens
    ),
  };

  const reasoning = buildRealtimeReasoningConfig(
    session.model,
    config.openAiRealtimeReasoningEffort
  );
  if (reasoning) {
    session.reasoning = reasoning;
  }

  return session;
}

function buildRealtimeReasoningConfig(model, effort) {
  if (!supportsRealtimeReasoning(model)) {
    return null;
  }

  const normalizedEffort = normalizeRealtimeReasoningEffort(effort);
  return normalizedEffort ? { effort: normalizedEffort } : null;
}

function normalizeRealtimeModel(value) {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : "merlin";
}

function normalizeRealtimeVoice(value) {
  return typeof value === "string" && value.trim() ? value.trim() : "marin";
}

// Build the realtime input-audio config. Pins a transcription language and
// enables noise reduction to reduce non-speech transcription hallucinations
// (e.g. phantom Japanese phrases on background noise/silence).
function buildRealtimeAudioInput(config) {
  const transcription = { model: "gpt-4o-mini-transcribe" };
  const language = normalizeRealtimeTranscribeLanguage(config.openAiRealtimeTranscribeLanguage);
  if (language) {
    transcription.language = language;
  }

  const input = {
    transcription,
    turn_detection: { type: "semantic_vad" },
  };

  const noiseReduction = normalizeRealtimeNoiseReduction(config.openAiRealtimeNoiseReduction);
  if (noiseReduction) {
    input.noise_reduction = { type: noiseReduction };
  }

  return input;
}

function normalizeRealtimeTranscribeLanguage(value) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!normalized || normalized === "auto") {
    return "";
  }
  // Accept ISO-639-1 ("en") or locale ("en-us"); ignore anything malformed.
  return /^[a-z]{2}(-[a-z]{2})?$/.test(normalized) ? normalized : "";
}

function normalizeRealtimeNoiseReduction(value) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (normalized === "off" || normalized === "none") {
    return "";
  }
  return normalized === "far_field" ? "far_field" : "near_field";
}

// Prefer the preset's voice when it is a valid realtime voice; otherwise fall
// back to the server-configured default.
function resolveRealtimeVoice(preferred, fallback) {
  const wanted = typeof preferred === "string" ? preferred.trim().toLowerCase() : "";
  if (REALTIME_VOICES.has(wanted)) {
    return wanted;
  }
  return normalizeRealtimeVoice(fallback);
}

// Append a preset's persona (tone/delivery style) to the base work-assistant
// instructions so the assistant keeps its capabilities but speaks in the preset
// voice. Returns the base instructions unchanged when no persona is supplied.
function buildRealtimeInstructions(persona) {
  const style =
    typeof persona === "string"
      ? persona.replace(/\s+/g, " ").trim().slice(0, REALTIME_PERSONA_MAX_CHARS)
      : "";
  const base = buildRealtimeAssistantInstructions(Boolean(style));
  if (!style) {
    return base;
  }

  return [
    base,
    "",
    "Voice and persona — this is who you are and how you speak. It fully governs your tone, delivery, pacing, vocabulary, warmth, and personality, and overrides any default style guidance. Stay in this character throughout the conversation while still using your full capabilities, the tools, and the grounding/privacy/safety rules above:",
    style,
  ].join("\n");
}

// Resolve a saved user preset by id from the file-backed presets store.
function loadUserPresetById(presetId) {
  const id = typeof presetId === "string" ? presetId.trim() : "";
  if (!id || !existsSync(USER_PRESETS_FILE)) {
    return null;
  }

  try {
    const parsed = JSON.parse(readFileSync(USER_PRESETS_FILE, "utf8"));
    if (!Array.isArray(parsed)) {
      return null;
    }
    return parsed.find((preset) => preset && preset.id === id) ?? null;
  } catch {
    return null;
  }
}

function normalizeRealtimeReasoningEffort(value) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return normalized === "low" || normalized === "medium" || normalized === "high"
    ? normalized
    : "";
}

function normalizeRealtimeMaxOutputTokens(value) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) {
    return 900;
  }

  return Math.min(
    REALTIME_MAX_OUTPUT_TOKENS_LIMIT,
    Math.max(1, parsed)
  );
}

function supportsRealtimeReasoning(model) {
  const normalized = normalizeRealtimeModel(model).toLowerCase();
  return (
    normalized === "gpt-realtime-2" ||
    normalized === "gpt-realtime-2025-08-28"
  );
}

function extractRealtimeErrorDetail(rawText, status) {
  const fallback = `OpenAI returned ${status}.`;
  if (typeof rawText !== "string" || !rawText.trim()) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(rawText);
    if (typeof parsed?.error?.message === "string" && parsed.error.message.trim()) {
      return parsed.error.message.trim();
    }
  } catch {}

  return rawText.trim().slice(0, 240) || fallback;
}

function normalizeVoiceReplayContext(value) {
  return typeof value === "string"
    ? value.replace(/\s+\n/g, "\n").trim().slice(0, VOICE_REPLAY_CONTEXT_MAX_CHARS)
    : "";
}

function normalizeVoiceReplayScript(value) {
  return typeof value === "string"
    ? value.replace(/\s+\n/g, "\n").trim().slice(0, VOICE_REPLAY_SCRIPT_MAX_CHARS)
    : "";
}

// ── Email send helpers (/api/email/send) ────────────────────────────────────

function normalizeEmailRecipients(value) {
  const raw = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[,;]/)
      : [];
  const seen = new Set();
  const out = [];
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

function normalizeEmailAttachments(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const out = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const name = typeof entry.name === "string" ? entry.name.trim() : "";
    const contentBase64 =
      typeof entry.contentBase64 === "string" ? entry.contentBase64.trim() : "";
    if (!name || !contentBase64) {
      continue;
    }
    const contentType =
      typeof entry.contentType === "string" && entry.contentType.trim()
        ? entry.contentType.trim()
        : "application/octet-stream";
    // base64 length → approximate decoded byte size.
    const bytes = Math.floor((contentBase64.replace(/=+$/, "").length * 3) / 4);
    out.push({ name, contentType, contentBase64, bytes });
  }
  return out;
}

// Validate + normalize an /api/email/send body. Returns { error } or a clean
// { to, cc, subject, body, bodyType, attachments } payload.
function parseEmailSendRequest(body) {
  const source = body && typeof body === "object" ? body : {};

  const to = normalizeEmailRecipients(source.to);
  const cc = normalizeEmailRecipients(source.cc);
  const subject = typeof source.subject === "string" ? source.subject.trim() : "";
  const content = typeof source.body === "string" ? source.body : "";
  const bodyType = source.bodyType === "HTML" ? "HTML" : "Text";

  if (to.length === 0) {
    return { error: "At least one 'to' recipient is required." };
  }
  if (to.length + cc.length > EMAIL_MAX_RECIPIENTS) {
    return { error: `Too many recipients (max ${EMAIL_MAX_RECIPIENTS}).` };
  }
  const invalid = [...to, ...cc].find((address) => !EMAIL_ADDRESS_PATTERN.test(address));
  if (invalid) {
    return { error: `Invalid email address: ${invalid}` };
  }
  if (!subject) {
    return { error: "A subject is required." };
  }
  if (subject.length > EMAIL_MAX_SUBJECT_CHARS) {
    return { error: `Subject is too long (max ${EMAIL_MAX_SUBJECT_CHARS} characters).` };
  }
  if (!content.trim()) {
    return { error: "A non-empty body is required." };
  }
  if (content.length > EMAIL_MAX_BODY_CHARS) {
    return { error: `Body is too long (max ${EMAIL_MAX_BODY_CHARS} characters).` };
  }

  const attachments = normalizeEmailAttachments(source.attachments);
  if (attachments.length > EMAIL_MAX_ATTACHMENTS) {
    return { error: `Too many attachments (max ${EMAIL_MAX_ATTACHMENTS}).` };
  }
  const oversized = attachments.find((file) => file.bytes > EMAIL_MAX_ATTACHMENT_BYTES);
  if (oversized) {
    return { error: `Attachment "${oversized.name}" exceeds the 3 MB limit.` };
  }

  return { to, cc, subject, body: content, bodyType, attachments };
}

function toGraphRecipients(addresses) {
  return addresses.map((address) => ({ emailAddress: { address } }));
}

function buildGraphDraftInput(parsed) {
  const draft = {
    subject: parsed.subject,
    body: { contentType: parsed.bodyType, content: parsed.body },
    toRecipients: toGraphRecipients(parsed.to),
  };
  if (parsed.cc.length > 0) {
    draft.ccRecipients = toGraphRecipients(parsed.cc);
  }
  if (parsed.attachments.length > 0) {
    draft.attachments = parsed.attachments.map((file) => ({
      "@odata.type": "#microsoft.graph.fileAttachment",
      name: file.name,
      contentType: file.contentType,
      contentBytes: file.contentBase64,
    }));
  }
  return draft;
}

// Append a non-sensitive audit record. Never logs tokens or attachment bytes.
function logEmailSend(entry) {
  try {
    mkdirSync(dirname(EMAIL_SEND_LOG_FILE), { recursive: true });
    appendFileSync(EMAIL_SEND_LOG_FILE, `${JSON.stringify(entry)}\n`, "utf8");
  } catch (error) {
    console.error("[/api/email/send] failed to append audit log:", error.message);
  }
}

// ── Mail / chat search helpers (/api/email/search, /api/chats/search) ────────

function normalizeSearchLimit(value, fallback = 10, max = 25) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(1, parsed));
}

function stripGraphHighlights(text) {
  return String(text ?? "")
    .replace(/<\/?c\d+>/g, "") // Search API highlight markers (<c0>…</c0>)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function shapeEmailSearchResult(message) {
  return {
    id: message.id,
    subject: message.subject || "(no subject)",
    from:
      message.from?.emailAddress?.name ||
      message.from?.emailAddress?.address ||
      "Unknown sender",
    date: message.receivedDateTime || null,
    isRead: message.isRead ?? null,
    snippet: stripGraphHighlights(message.bodyPreview).slice(0, 300),
    webLink: message.webLink || null,
  };
}


const lucideDirectory = fileURLToPath(
  new URL("../../node_modules/lucide/dist/esm/", import.meta.url)
);

export function createApp({ config, portalService, summarizer, parser, asker, graphAuth, emailContextSummarizer, kbService, gennyStudioService, sourcebotService, docsKbService, codeKbService, teamGptAuthService, assistantModelProvider, assistantPendingActionStore, assistantBambooImageHooks, assistantController, orchestrator, executiveDayOrganizer }) {
  const app = express();
  const rewriteAssistantPayload = ({ prompt, payload }) =>
    assistantBambooImageHooks?.rewriteAssistantPayload
      ? assistantBambooImageHooks.rewriteAssistantPayload({ prompt, payload })
      : payload;

  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));

  app.post(
    "/api/realtime/session",
    express.text({ type: ["application/sdp", "text/plain"], limit: "1mb" }),
    async (request, response, next) => {
      try {
        if (!config.openAiRealtimeEnabled) {
          response.status(503).json({ ok: false, error: "Realtime is disabled." });
          return;
        }

        if (!config.openAiApiKey) {
          response.status(503).json({
            ok: false,
            error: "OpenAI API key is not configured.",
          });
          return;
        }

        const offerSdp = typeof request.body === "string" ? request.body : "";
        if (!offerSdp.trim()) {
          response.status(400).json({ ok: false, error: "SDP offer is required." });
          return;
        }

        if (offerSdp.length > REALTIME_MAX_OFFER_SDP_CHARS) {
          response.status(400).json({ ok: false, error: "SDP offer is too large." });
          return;
        }

        const presetParam =
          typeof request.query?.preset === "string" ? request.query.preset : "";
        const preset = loadUserPresetById(presetParam);
        const session = buildRealtimeSessionConfig(
          config,
          preset
            ? { voice: preset.voice, instructions: preset.instructions }
            : {}
        );
        const safetyId = createHash("sha256")
          .update(`${hostname()}::portal-realtime`)
          .digest("hex")
          .slice(0, 32);

        // Guarantee the trailing CRLF the SDP parser requires, in case any hop
        // stripped it ("failed to unmarshal SDP: EOF").
        const sdpForOpenAi = offerSdp.endsWith("\n") ? offerSdp : `${offerSdp}\r\n`;

        const formData = new FormData();
        formData.set("sdp", sdpForOpenAi);
        formData.set("session", JSON.stringify(session));

        const openAiResponse = await fetch("https://api.openai.com/v1/realtime/calls", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.openAiApiKey}`,
            "OpenAI-Safety-Identifier": safetyId,
          },
          body: formData,
        });

        if (!openAiResponse.ok) {
          const errorText = await openAiResponse.text().catch(() => "");
          // The OpenAI validation body (e.g. "unknown parameter") is needed to
          // diagnose 4xx rejections; it contains no secrets.
          console.error(
            "[/api/realtime/session] OpenAI error:",
            openAiResponse.status,
            errorText
          );
          response.status(502).json({
            ok: false,
            error: "Realtime session failed.",
            detail: extractRealtimeErrorDetail(errorText, openAiResponse.status),
          });
          return;
        }

        const answerSdp = await openAiResponse.text();
        response.setHeader("Content-Type", "application/sdp");
        response.send(answerSdp);
      } catch (error) {
        next(error);
      }
    }
  );

  app.use("/vendor/lucide", express.static(lucideDirectory));
  app.use(express.static(publicDirectory));

  app.get("/api/health", (request, response) => {
    try {
      void respondWithRuntime(
        {
          config,
          portalService,
          summarizer,
          parser,
          asker,
          teamGptAuthService,
          testerConfig: parseTesterConfigQuery(request.query?.testerConfig)
        },
        async ({
          effectiveConfig,
          portalService: runtimePortalService,
          summarizer: runtimeSummarizer,
          parser: runtimeParser,
          asker: runtimeAsker,
          usingTesterConfig
        }) => {
          response.json({
            ok: true,
            config: {
              port: effectiveConfig.port,
              portal: runtimePortalService.describe(),
              summarizer: runtimeSummarizer.describe(),
              parser: runtimeParser.describe(),
              ask: runtimeAsker.describe(),
              kb: kbService?.describe() ?? { enabled: false },
              gstudio: gennyStudioService?.describe() ?? { enabled: false },
              sourcebot: sourcebotService?.describe() ?? { enabled: false },
              docsKb: docsKbService?.describe() ?? { enabled: false },
              codeKb: codeKbService?.describe() ?? { enabled: false }
            },
            testing: {
              usingTesterConfig
            },
            now: new Date().toISOString()
          });
        }
      ).catch((error) => {
        response.status(error.statusCode || 500).json({
          error: error.message || "Unexpected server error."
        });
      });
    } catch (error) {
      response.status(error.statusCode || 500).json({
        error: error.message || "Unexpected server error."
      });
    }
  });

  app.get("/api/dashboard/cache", (request, response) => {
    const testerConfig = parseTesterConfigQuery(request.query?.testerConfig);
    const cacheFile =
      typeof testerConfig.dashboardCacheFile === "string"
        ? testerConfig.dashboardCacheFile
        : config.dashboardCacheFile;

    response.json(readDashboardCache(cacheFile) || null);
  });

  app.post("/api/dashboard/cache", (request, response, next) => {
    try {
      const testerConfig = normalizeTesterConfig(request.body?.testerConfig);
      const cacheFile =
        typeof testerConfig.dashboardCacheFile === "string"
          ? testerConfig.dashboardCacheFile
          : config.dashboardCacheFile;
      const payload = writeDashboardCache(
        cacheFile,
        request.body
      );
      response.json(payload);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/portal/preview", async (request, response, next) => {
    try {
      await respondWithRuntime(
        {
          config,
          portalService,
          summarizer,
          parser,
          teamGptAuthService,
          testerConfig: normalizeTesterConfig(request.body?.testerConfig)
        },
        async ({ portalService: runtimePortalService, summarizer: runtimeSummarizer }) => {
          const payload = await buildPreviewPayload({
            portalService: runtimePortalService,
            summarizer: runtimeSummarizer,
            includeSummary: request.body?.includeSummary === true,
            focus: request.body?.focus,
            summaryProvider: request.body?.summaryProvider,
            summaryTone: request.body?.summaryTone
          });

          response.json(payload);
        }
      );
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/portal/parse", async (request, response, next) => {
    try {
      await respondWithRuntime(
        {
          config,
          portalService,
          summarizer,
          parser,
          teamGptAuthService,
          testerConfig: normalizeTesterConfig(request.body?.testerConfig)
        },
        async ({ portalService: runtimePortalService, parser: runtimeParser }) => {
          const payload = await buildParserPayload({
            portalService: runtimePortalService,
            parser: runtimeParser,
            graphAuth,
            emailContextSummarizer,
            focus: request.body?.focus,
            testchat: request.body?.testchat === true,
            model: request.body?.model,
            provider: request.body?.parserProvider,
            tone: request.body?.summaryTone ?? request.body?.tone
          });

          response.json(payload);
        }
      );
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/ask", async (request, response, next) => {
    try {
      await respondWithRuntime(
        {
          config,
          portalService,
          summarizer,
          parser,
          asker,
          teamGptAuthService,
          testerConfig: normalizeTesterConfig(request.body?.testerConfig)
        },
        async ({ asker: runtimeAsker }) => {
          const prompt = normalizeAskPrompt(
            request.body?.prompt ?? request.body?.question
          );

          if (!prompt) {
            const error = new Error("Prompt is required.");
            error.statusCode = 400;
            throw error;
          }

          const payload = await buildAskPayload({
            config,
            orchestrator,
            asker: runtimeAsker,
            prompt,
            model: request.body?.model,
            provider: request.body?.provider,
            threadId: request.body?.threadId
          });

          // The realtime voice dock asks through this route, so it needs the
          // same Bamboo image rewrite (proxy URLs + renderable image markup)
          // as /api/assistant/chat.
          response.json(rewriteAssistantPayload({ prompt, payload }));
        }
      );
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/teamgpt/auth", async (request, response, next) => {
    try {
      const authPayload = await teamGptAuthService.getJwtToken();
      response.json({
        ok: true,
        jwtToken: authPayload.jwtToken,
        pageUrl: authPayload.pageUrl,
        endpointUrl: config.teamGptEndpointUrl,
        appId: config.teamGptAppId,
        environment: config.teamGptEnvironment
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/teamgpt/test", async (request, response, next) => {
    try {
      const endpointUrl = normalizeTeamGptEndpointUrl(request.body?.endpointUrl);
      const headers = normalizeTeamGptHeaders(request.body?.headers);
      const body = request.body?.body && typeof request.body.body === "object"
        ? request.body.body
        : {};
      let usedAutoAuth = false;
      let tokenPreview = "";

      if (!headers.Authorization) {
        const authPayload = await teamGptAuthService.getJwtToken();
        headers.Authorization = `Bearer ${authPayload.jwtToken}`;
        headers.appid = headers.appid || config.teamGptAppId;
        headers.environment = headers.environment || config.teamGptEnvironment;
        headers.ThreadID = headers.ThreadID || "";
        usedAutoAuth = true;
      } else {
        headers.appid = headers.appid || config.teamGptAppId;
        headers.environment = headers.environment || config.teamGptEnvironment;
        headers.ThreadID = headers.ThreadID || "";
      }

      tokenPreview = buildTokenPreview(headers.Authorization);

      const upstreamResponse = await fetch(endpointUrl, {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      const rawText = await upstreamResponse.text();
      response.status(upstreamResponse.status).json({
        ok: upstreamResponse.ok,
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
        usedAutoAuth,
        endpointUrl,
        headers: {
          ...headers,
          Authorization: headers.Authorization ? "[redacted]" : ""
        },
        tokenPreview,
        requestBody: body,
        rawText
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/dashboard", async (request, response, next) => {
    try {
      await respondWithRuntime(
        {
          config,
          portalService,
          summarizer,
          parser,
          asker,
          teamGptAuthService,
          testerConfig: normalizeTesterConfig(request.body?.testerConfig)
        },
        async ({
          portalService: runtimePortalService,
          summarizer: runtimeSummarizer,
          parser: runtimeParser,
          asker: runtimeAsker
        }) => {
          const payload = await buildDashboardPayload({
            portalService: runtimePortalService,
            summarizer: runtimeSummarizer,
            parser: runtimeParser,
            graphAuth,
            emailContextSummarizer,
            includeSummary: request.body?.includeSummary !== false,
            focus: request.body?.focus,
            summaryProvider: request.body?.summaryProvider,
            summaryTone: request.body?.summaryTone,
            parserFocus: request.body?.parserFocus,
            parserTestchat: request.body?.parserTestchat === true,
            model: request.body?.model,
            parserProvider: request.body?.parserProvider
          });

          response.json(payload);
        }
      );
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/item/email", async (request, response, next) => {
    try {
      if (!graphAuth) {
        response.status(503).json({ ok: false, error: "Graph auth is not configured." });
        return;
      }

      let token;
      try {
        token = await graphAuth.getAccessToken();
      } catch (authError) {
        response.status(authError.statusCode || 401).json({ ok: false, error: authError.message });
        return;
      }

      const { requestId, relatedActionItem } = request.body || {};
      const email = await findItemEmail(token, { requestId, relatedActionItem });
      response.json({ ok: true, email });
    } catch (error) {
      next(error);
    }
  });

  // Send an email via Microsoft Graph. The assistant only stages a draft; the
  // actual send is a user-confirmed action that hits this route. Returns minimal
  // metadata (message id + status) and never exposes tokens.
  app.post("/api/email/send", async (request, response, next) => {
    try {
      if (!config.graphMailSendEnabled) {
        response.status(503).json({
          ok: false,
          error:
            "Email sending is disabled. Set GRAPH_MAIL_SEND_ENABLED=true and grant Mail.Send + Mail.ReadWrite.",
        });
        return;
      }

      if (!graphAuth) {
        response.status(503).json({ ok: false, error: "Graph auth is not configured." });
        return;
      }

      const parsed = parseEmailSendRequest(request.body);
      if (parsed.error) {
        response.status(400).json({ ok: false, error: parsed.error });
        return;
      }

      let token;
      try {
        token = await graphAuth.getAccessToken();
      } catch (authError) {
        response.status(authError.statusCode || 401).json({ ok: false, error: authError.message });
        return;
      }

      const auditBase = {
        ts: new Date().toISOString(),
        to: parsed.to,
        cc: parsed.cc,
        subject: parsed.subject,
        bodyType: parsed.bodyType,
        bodyChars: parsed.body.length,
        attachments: parsed.attachments.map((file) => ({ name: file.name, bytes: file.bytes })),
      };

      let draft;
      try {
        // Draft-then-send so we can return a real message id.
        draft = await createDraftMessage(token, buildGraphDraftInput(parsed));
        await sendDraftMessage(token, draft.id);
      } catch (graphError) {
        const status = Number(graphError?.status) || 502;
        const detail = graphError?.graphMessage || graphError?.message || "Graph send failed.";
        logEmailSend({ ...auditBase, status: "failed", error: detail });
        if (status === 403) {
          response.status(403).json({
            ok: false,
            error:
              "Microsoft Graph rejected the send. The signed-in account is likely missing the Mail.Send permission.",
            detail,
          });
          return;
        }
        response.status(502).json({ ok: false, error: "Failed to send email.", detail });
        return;
      }

      logEmailSend({ ...auditBase, status: "sent", messageId: draft.id });
      console.log(
        `[/api/email/send] sent to=${parsed.to.length} cc=${parsed.cc.length} subject="${parsed.subject}" id=${draft.id}`
      );

      response.json({
        ok: true,
        status: "sent",
        messageId: draft.id,
        webLink: draft.webLink ?? null,
        to: parsed.to,
        cc: parsed.cc,
        subject: parsed.subject,
      });
    } catch (error) {
      next(error);
    }
  });

  // Read-only mailbox search (assistant tool: search_emails).
  app.post("/api/email/search", async (request, response, next) => {
    try {
      if (!graphAuth) {
        response.status(503).json({ ok: false, error: "Graph auth is not configured." });
        return;
      }

      const query = typeof request.body?.query === "string" ? request.body.query.trim() : "";
      if (!query) {
        response.status(400).json({ ok: false, error: "A search query is required." });
        return;
      }
      const limit = normalizeSearchLimit(request.body?.limit);

      let token;
      try {
        token = await graphAuth.getAccessToken();
      } catch (authError) {
        response.status(authError.statusCode || 401).json({ ok: false, error: authError.message });
        return;
      }

      let messages;
      try {
        messages = await searchMyMessages(token, query, {
          top: limit,
          select: "id,subject,from,receivedDateTime,bodyPreview,isRead,webLink",
        });
      } catch (graphError) {
        const status = Number(graphError?.status) || 502;
        const detail = graphError?.graphMessage || graphError?.message || "Graph search failed.";
        response.status(status === 403 ? 403 : 502).json({
          ok: false,
          error:
            status === 403
              ? "Microsoft Graph rejected the search (the account may be missing Mail.Read)."
              : "Email search failed.",
          detail,
        });
        return;
      }

      const results = (Array.isArray(messages) ? messages : [])
        .slice(0, limit)
        .map(shapeEmailSearchResult);
      response.json({ ok: true, count: results.length, results });
    } catch (error) {
      next(error);
    }
  });

  // Read-only "most recent messages" (assistant tool: get_recent_emails).
  // Unlike /api/email/search (keyword $search), this lists the latest inbox
  // messages ordered by received date, so the assistant can answer questions
  // like "what's my last/newest email" that have no search keyword.
  app.post("/api/email/recent", async (request, response, next) => {
    try {
      if (!graphAuth) {
        response.status(503).json({ ok: false, error: "Graph auth is not configured." });
        return;
      }

      const limit = normalizeSearchLimit(request.body?.limit);

      let token;
      try {
        token = await graphAuth.getAccessToken();
      } catch (authError) {
        response.status(authError.statusCode || 401).json({ ok: false, error: authError.message });
        return;
      }

      let messages;
      try {
        messages = await listInboxMessages(token, {
          top: limit,
          select: "id,subject,from,receivedDateTime,bodyPreview,isRead,webLink",
          orderby: "receivedDateTime desc",
        });
      } catch (graphError) {
        const status = Number(graphError?.status) || 502;
        const detail = graphError?.graphMessage || graphError?.message || "Graph request failed.";
        response.status(status === 403 ? 403 : 502).json({
          ok: false,
          error:
            status === 403
              ? "Microsoft Graph rejected the request (the account may be missing Mail.Read)."
              : "Could not list recent emails.",
          detail,
        });
        return;
      }

      const results = (Array.isArray(messages) ? messages : [])
        .slice(0, limit)
        .map(shapeEmailSearchResult);
      response.json({ ok: true, count: results.length, results });
    } catch (error) {
      next(error);
    }
  });

  // Read-only Teams chat search (assistant tool: search_chats).
  app.post("/api/chats/search", async (request, response, next) => {
    try {
      if (!graphAuth) {
        response.status(503).json({ ok: false, error: "Graph auth is not configured." });
        return;
      }

      const query = typeof request.body?.query === "string" ? request.body.query.trim() : "";
      if (!query) {
        response.status(400).json({ ok: false, error: "A search query is required." });
        return;
      }
      const limit = normalizeSearchLimit(request.body?.limit);

      let token;
      try {
        token = await graphAuth.getAccessToken();
      } catch (authError) {
        response.status(authError.statusCode || 401).json({ ok: false, error: authError.message });
        return;
      }

      let results;
      try {
        // Chat.Read-only scan of recent chats (no admin consent required).
        results = await searchRecentChatMessages(token, query, { limit });
      } catch (graphError) {
        const status = Number(graphError?.status) || 502;
        const detail = graphError?.graphMessage || graphError?.message || "Graph search failed.";
        response.status(status === 403 ? 403 : 502).json({
          ok: false,
          error:
            status === 403
              ? "Teams chat search was denied. The account needs at least Chat.Read."
              : "Chat search failed.",
          detail,
        });
        return;
      }

      response.json({ ok: true, count: results.length, results });
    } catch (error) {
      next(error);
    }
  });

  // Executive Day Organizer: two-stage briefing over today's calendar, the
  // last 24h of email/Teams chat, and unread mail. Stage 1 prefilters raw
  // Graph data into strict JSON; Stage 2 writes the executive briefing
  // markdown from that JSON only. Source IDs are validated server-side.
  app.post("/api/briefing/day", async (request, response, next) => {
    try {
      if (!executiveDayOrganizer) {
        response.status(503).json({ ok: false, error: "The day organizer is not configured." });
        return;
      }
      if (!graphAuth) {
        response.status(503).json({ ok: false, error: "Graph auth is not configured." });
        return;
      }

      const userContext =
        typeof request.body?.userContext === "string" ? request.body.userContext.trim() : "";

      let token;
      try {
        token = await graphAuth.getAccessToken();
      } catch (authError) {
        response.status(authError.statusCode || 401).json({
          ok: false,
          error: authError.message,
          hint: "Sign in via the Graph tester (npm run graph-tester) to refresh the portal Graph token.",
        });
        return;
      }

      let result;
      try {
        result = await executiveDayOrganizer.generateBriefing({ token, userContext });
      } catch (briefingError) {
        const status = Number(briefingError?.statusCode) || Number(briefingError?.status) || 0;
        if (status >= 400 && status < 600) {
          response.status(status).json({ ok: false, error: briefingError.message });
          return;
        }
        throw briefingError;
      }

      response.json({ ok: true, ...result });
    } catch (error) {
      next(error);
    }
  });

  // Full Graph surface for the assistant (tool: list_graph_functions).
  // Same allowlisted catalog and delegated-scope gating as the Graph tester —
  // only functions the signed-in token actually supports are returned.
  app.get("/api/assistant/graph/functions", async (request, response, next) => {
    try {
      if (!graphAuth) {
        response.status(503).json({ ok: false, error: "Graph auth is not configured." });
        return;
      }

      let token;
      try {
        token = await graphAuth.getAccessToken();
      } catch (authError) {
        response.status(authError.statusCode || 401).json({ ok: false, error: authError.message });
        return;
      }

      const grantedScopes = getTokenScopes(token);
      const serviceFilter =
        typeof request.query.service === "string" ? request.query.service.trim() : "";
      const searchFilter =
        typeof request.query.search === "string"
          ? request.query.search.trim().toLowerCase()
          : "";

      const services = getClientCatalog(grantedScopes)
        .filter((service) => !serviceFilter || service.key === serviceFilter)
        .map((service) => ({
          service: service.key,
          label: service.label,
          description: service.description,
          functions: service.functions
            .filter(
              (entry) =>
                !searchFilter ||
                entry.functionName.toLowerCase().includes(searchFilter) ||
                entry.label.toLowerCase().includes(searchFilter) ||
                entry.description.toLowerCase().includes(searchFilter)
            )
            // Compact shape: enough for the model to pick a function and build
            // args without flooding the realtime context.
            .map((entry) => ({
              functionName: entry.functionName,
              label: entry.label,
              description: entry.description,
              mutation: entry.mutation,
              requiredFields: entry.requiredFields,
              fields: entry.fields.map((field) => ({
                name: field.name,
                type: field.type,
                required: Boolean(field.required),
                description: field.description || field.placeholder || "",
              })),
            })),
        }))
        .filter((service) => service.functions.length > 0);

      response.json({
        ok: true,
        grantedScopeCount: grantedScopes.length,
        services,
      });
    } catch (error) {
      next(error);
    }
  });

  // Run any allowlisted Graph function for the assistant (tool:
  // run_graph_function). Scope gating and the mutation confirmation gate are
  // enforced here, server-side — never in the model or the browser.
  app.post("/api/assistant/graph/run", async (request, response, next) => {
    try {
      if (!graphAuth) {
        response.status(503).json({ ok: false, error: "Graph auth is not configured." });
        return;
      }

      const {
        service = "",
        functionName = "",
        args = {},
        confirmMutation = false,
      } = request.body || {};

      const entry = getCatalogEntry(String(service), String(functionName));
      if (!entry || entry.hidden) {
        response.status(404).json({
          ok: false,
          error: `Unknown Graph function ${service}.${functionName}. Use list_graph_functions to discover valid names.`,
        });
        return;
      }

      let token;
      try {
        token = await graphAuth.getAccessToken();
      } catch (authError) {
        response.status(authError.statusCode || 401).json({ ok: false, error: authError.message });
        return;
      }

      const grantedScopes = getTokenScopes(token);
      if (!isCatalogEntryEnabled(entry, grantedScopes)) {
        const missingScopes = getCatalogEntryMissingScopes(entry, grantedScopes);
        response.status(403).json({
          ok: false,
          error: `The signed-in token does not grant the scopes needed for ${service}.${functionName}.`,
          missingScopes,
        });
        return;
      }

      if (entry.mutation && confirmMutation !== true) {
        response.status(400).json({
          ok: false,
          error:
            `${service}.${functionName} changes live Microsoft 365 data. Read the exact change back to Mataan, ` +
            "get his explicit yes, then retry with confirmMutation: true.",
          requiresConfirmation: true,
        });
        return;
      }

      let normalizedArgs;
      try {
        normalizedArgs = parseCatalogArgs(entry, args && typeof args === "object" ? args : {});
      } catch (validationError) {
        response.status(validationError.statusCode || 400).json({
          ok: false,
          error: validationError.message,
          details: validationError.details || {},
        });
        return;
      }

      const startedAt = Date.now();
      let data;
      try {
        data = await entry.invoke(token, normalizedArgs);
      } catch (graphError) {
        const status = Number(graphError?.status) || Number(graphError?.statusCode) || 502;
        response.status(status >= 400 && status < 600 ? status : 502).json({
          ok: false,
          error: graphError?.graphMessage || graphError?.message || "Graph request failed.",
        });
        return;
      }

      console.log(
        `[/api/assistant/graph/run] ${service}.${functionName} mutation=${entry.mutation} durationMs=${Date.now() - startedAt}`
      );
      response.json({
        ok: true,
        service,
        functionName,
        mutation: entry.mutation,
        data,
        durationMs: Date.now() - startedAt,
      });
    } catch (error) {
      next(error);
    }
  });

  // Friendly mail.read/mail.send/... capability view for the assistant UI.
  // Derived from the same delegated-scope catalog as /api/assistant/graph/functions.
  app.get("/api/assistant/capabilities", async (request, response, next) => {
    try {
      if (!graphAuth) {
        response.status(503).json({ ok: false, error: "Graph auth is not configured." });
        return;
      }

      let token;
      try {
        token = await graphAuth.getAccessToken();
      } catch (authError) {
        response.status(authError.statusCode || 401).json({ ok: false, error: authError.message });
        return;
      }

      const grantedScopes = getTokenScopes(token);
      response.json({ ok: true, capabilities: buildFriendlyCapabilities(grantedScopes) });
    } catch (error) {
      next(error);
    }
  });

  // Current assistant chat model + embedding mode/model/reachability.
  app.get("/api/assistant/model-status", async (request, response, next) => {
    try {
      const docs = docsKbService?.describe?.() ?? { enabled: false };
      const code = codeKbService?.describe?.() ?? { enabled: false };
      const embeddings = {
        docs: { enabled: docs.enabled, mode: docs.embeddingMode ?? null, model: docs.embeddingModel ?? null },
        code: { enabled: code.enabled, mode: code.embeddingMode ?? null, model: code.embeddingModel ?? null },
      };

      if (config.assistantModelMode === "orchestrator" && orchestrator) {
        response.json({
          ok: true,
          chat: {
            mode: "orchestrator",
            provider: "orchestrator",
            model: "deterministic-router",
            enabled: true,
            reachable: null,
            reason: null,
          },
          embeddings,
          orchestrator: orchestrator.describe(),
        });
        return;
      }

      if (!assistantModelProvider) {
        response.status(503).json({ ok: false, error: "Assistant model provider is not configured." });
        return;
      }

      const chat = await assistantModelProvider.describe();
      response.json({
        ok: true,
        chat,
        embeddings,
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/assistant/bamboo-image", async (request, response, next) => {
    try {
      if (!assistantBambooImageHooks?.fetchImage) {
        response.status(503).json({ ok: false, error: "Bamboo image proxy is not configured." });
        return;
      }

      const requestedUrl = firstQueryValue(request.query?.url);
      const placeholderRequested = ["1", "true", "yes"].includes(
        String(firstQueryValue(request.query?.placeholder) || "").toLowerCase()
      );
      if (!requestedUrl && !placeholderRequested) {
        response.status(400).json({ ok: false, error: "url or placeholder is required." });
        return;
      }

      const result = placeholderRequested
        ? await assistantBambooImageHooks.fetchPlaceholder()
        : await assistantBambooImageHooks.fetchImage(requestedUrl);
      response.setHeader("Content-Type", result.contentType);
      response.setHeader("Cache-Control", result.cacheControl);
      if (result.etag) {
        response.setHeader("ETag", result.etag);
      }
      if (result.lastModified) {
        response.setHeader("Last-Modified", result.lastModified);
      }
      if (Number.isFinite(result.contentLength) && result.contentLength > 0) {
        response.setHeader("Content-Length", String(result.contentLength));
      }
      response.send(result.buffer);
    } catch (error) {
      if (error?.statusCode) {
        response.status(error.statusCode).json({ ok: false, error: error.message });
        return;
      }
      next(error);
    }
  });

  // Text assistant chat. Default mode is the deterministic orchestrator (no
  // reasoning model, no Graph sign-in required for non-Graph routes). Legacy
  // cloud/local modes keep the tool-calling controller. Mutations are never
  // executed here in any mode; the deterministic path never even proposes
  // them, and the legacy path returns proposedActions for the UI to confirm.
  app.post("/api/assistant/chat", async (request, response, next) => {
    try {
      const messages = Array.isArray(request.body?.messages) ? request.body.messages : [];
      if (!messages.length) {
        response.status(400).json({ ok: false, error: "messages is required." });
        return;
      }
      const normalizedMessages = normalizeAssistantChatLogMessages(messages);
      const lastUser = [...normalizedMessages].reverse().find((message) => message.role === "user");
      const lastUserPrompt = lastUser?.content || "";

      if (config.assistantModelMode === "orchestrator" && orchestrator) {
        if (!lastUser || !lastUser.content.trim()) {
          response.status(400).json({ ok: false, error: "A user message is required." });
          return;
        }

        const result = await orchestrator.ask({
          prompt: lastUser.content,
          history: normalizedMessages.slice(-20)
        });
        const payload = rewriteAssistantPayload({
          prompt: lastUserPrompt,
          payload: {
            ok: true,
            content: result.content,
            answer: result.answer,
            blocks: result.blocks,
            sources: result.sources,
            proposedActions: [],
            toolTrace: result.toolTrace,
            provider: result.provider,
            route: result.route,
            model: result.model ?? "deterministic-router",
            modelMode: "orchestrator"
          }
        });
        appendAssistantConversationLog(
          buildAssistantChatLogEntry({
            messages: normalizedMessages,
            responsePayload: payload,
          })
        );
        response.json(payload);
        return;
      }

      if (!assistantController || !assistantModelProvider) {
        response.status(503).json({ ok: false, error: "Assistant is not configured." });
        return;
      }

      const result = await assistantController.handleChat({ messages });
      const payload = rewriteAssistantPayload({
        prompt: lastUserPrompt,
        payload: {
          ok: true,
          ...result,
          answer: result.content,
          blocks:
            Array.isArray(result.blocks) && result.blocks.length > 0
              ? result.blocks
              : typeof result.content === "string" && result.content
                ? [textBlock(result.content)]
                : [],
          provider: result.modelMode === "local" ? "ollama" : "cloud",
          route: `legacy_${result.modelMode}`
        }
      });
      appendAssistantConversationLog(
        buildAssistantChatLogEntry({
          messages: normalizedMessages,
          responsePayload: payload,
        })
      );
      response.json(payload);
    } catch (error) {
      if (error?.statusCode) {
        response.status(error.statusCode).json({ ok: false, error: error.message });
        return;
      }
      next(error);
    }
  });

  app.post("/api/assistant/actions/:id/confirm", async (request, response, next) => {
    try {
      if (!assistantController) {
        response.status(503).json({ ok: false, error: "Assistant is not configured." });
        return;
      }

      const outcome = await assistantController.confirmAction(request.params.id);
      if (!outcome.ok) {
        response.status(502).json({ ok: false, error: outcome.error });
        return;
      }
      response.json({ ok: true, result: outcome.result, action: outcome.action });
    } catch (error) {
      if (error?.statusCode) {
        response.status(error.statusCode).json({ ok: false, error: error.message });
        return;
      }
      next(error);
    }
  });

  app.post("/api/assistant/actions/:id/cancel", async (request, response, next) => {
    try {
      if (!assistantController) {
        response.status(503).json({ ok: false, error: "Assistant is not configured." });
        return;
      }

      const action = assistantController.cancelAction(request.params.id);
      response.json({ ok: true, action });
    } catch (error) {
      if (error?.statusCode) {
        response.status(error.statusCode).json({ ok: false, error: error.message });
        return;
      }
      next(error);
    }
  });

  app.post("/api/item/research", async (request, response, next) => {
    try {
      const canUseSourcebot = Boolean(sourcebotService?.enabled);
      const kbStatus = kbService?.describe?.() ?? { enabled: false, authConfigured: false };
      const canUseKb =
        Boolean(kbStatus.enabled) &&
        Boolean(kbStatus.authConfigured || request.headers.authorization);
      const canUseGstudio = Boolean(gennyStudioService?.describe?.()?.enabled);
      const canUseDocs = Boolean(docsKbService?.describe?.()?.enabled);

      if (!canUseSourcebot && !canUseKb && !canUseGstudio && !canUseDocs) {
        response.status(503).json({ ok: false, error: "No research sources are configured (Genny Studio, Sourcebot, KB, or Docs)." });
        return;
      }

      const { query, messages = [], itemContext = "", gstudioSessionId = "" } = request.body || {};
      if (!query || typeof query !== "string" || !query.trim()) {
        response.status(400).json({ ok: false, error: "query is required." });
        return;
      }

      const result = await runResearchPipeline({
        sourcebotService,
        kbService,
        gennyStudioService,
        docsKbService,
        config,
        itemContext,
        userQuery: query.trim(),
        messages,
        teamGptAuthService,
        kbAuthToken: request.headers.authorization,
        gstudioSessionId,
      });

      response.json({
        ok: true,
        report: result.report,
        codeFindings: result.codeFindings,
        kbFindings: result.kbFindings,
        docsFindings: result.docsFindings,
        chatUrl: result.chatUrl,
        retrievalTrail: result.retrievalTrail,
        gstudioSessionId: result.gstudioSessionId || "",
      });
    } catch (error) {
      console.error("[/api/item/research]", error);
      next(error);
    }
  });

  app.post("/api/docs/search", async (request, response, next) => {
    try {
      if (!docsKbService?.describe?.()?.enabled) {
        response.status(503).json({ ok: false, error: "Docs knowledge base is not configured." });
        return;
      }

      const query = typeof request.body?.query === "string" ? request.body.query.trim() : "";
      if (!query) {
        response.status(400).json({ ok: false, error: "query is required." });
        return;
      }

      const chunks = await docsKbService.search(query);
      const results = (Array.isArray(chunks) ? chunks : []).map((chunk) => ({
        doc: chunk?.docPath ?? null,
        heading: chunk?.heading ?? null,
        text: typeof chunk?.text === "string" ? chunk.text.slice(0, 1200) : "",
      }));

      response.json({ ok: true, results });
    } catch (error) {
      console.error("[/api/docs/search]", error);
      next(error);
    }
  });

  app.post("/api/tts/card-replay", async (request, response, next) => {
    try {
      await respondWithRuntime(
        {
          config,
          portalService,
          summarizer,
          parser,
          asker,
          teamGptAuthService,
          testerConfig: normalizeTesterConfig(request.body?.testerConfig)
        },
        async ({ asker: runtimeAsker }) => {
          const reportText = normalizeVoiceReplayContext(request.body?.reportText);
          const item = request.body?.item && typeof request.body.item === "object"
            ? request.body.item
            : null;

          if (!reportText && !item) {
            response.status(400).json({ ok: false, error: "reportText or item is required." });
            return;
          }

          const cardJson = item
            ? JSON.stringify(item, null, 2).slice(0, VOICE_REPLAY_CONTEXT_MAX_CHARS)
            : "{}";
          const prompt = buildVoiceReplayPrompt(reportText || cardJson, cardJson);
          const result = await runtimeAsker.ask(prompt, {
            model: request.body?.model,
            provider: request.body?.provider,
            threadId: request.body?.threadId,
            tone: "Warm + Playful + Work-Appropriate",
            wordLimit: 650
          });

          if (result.enabled !== true) {
            response.status(503).json({
              ok: false,
              error: result.reason || "Voice replay rewrite is unavailable.",
              debug: result.debug
            });
            return;
          }

          const text = normalizeVoiceReplayScript(result.answer);
          if (!text) {
            response.status(502).json({ ok: false, error: "Voice replay rewrite returned empty text." });
            return;
          }

          response.json({
            ok: true,
            text,
            provider: result.provider,
            model: result.model,
            debug: result.debug
          });
        }
      );
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/tts", async (request, response, next) => {
    try {
      const apiKey = config.openAiApiKey;
      if (!apiKey) {
        response.status(503).json({ ok: false, error: "OpenAI API key is not configured." });
        return;
      }

      const {
        text,
        tonePreset = "warmExecutive",
        format = "mp3",
        voice: reqVoice,
        instructions: reqInstructions,
        speed: reqSpeed,
        volume: reqVolume,
        afChain: reqAfChain,
        finalizeChain: reqFinalizeChain,
        vst: reqVst,
      } = request.body || {};

      if (!text || typeof text !== "string" || !text.trim()) {
        response.status(400).json({ ok: false, error: "text is required." });
        return;
      }

      const cleanText = cleanTtsText(text);
      if (!cleanText) {
        response.status(400).json({ ok: false, error: "text is empty after cleaning." });
        return;
      }

      const preset = TTS_TONE_PRESETS[tonePreset] ?? TTS_TONE_PRESETS.warmExecutive;
      const finalVoice = (typeof reqVoice === "string" && reqVoice.trim()) ? reqVoice.trim() : preset.voice;
      const finalInstructions = appendMataanPronunciationRule(
        (typeof reqInstructions === "string" && reqInstructions.trim())
          ? reqInstructions.trim()
          : preset.instructions
      );
      const finalSpeed = (typeof reqSpeed === "number" && reqSpeed >= 0.25 && reqSpeed <= 4.0) ? reqSpeed : null;
      const finalVolume = (typeof reqVolume === "number" && reqVolume >= 0.1 && reqVolume <= 3.0) ? reqVolume : 1.0;
      const finalAfChain = isSafeFfmpegChain(reqAfChain) ? reqAfChain.trim() : null;
      const finalizeChain = isSafeFfmpegChain(reqFinalizeChain) ? reqFinalizeChain.trim() : null;
      const finalVst = isValidVstRequest(reqVst) ? reqVst : null;

      const MIME = { mp3: "audio/mpeg", opus: "audio/opus", aac: "audio/aac", flac: "audio/flac", wav: "audio/wav", pcm: "audio/pcm" };
      const contentType = MIME[format] ?? "audio/mpeg";

      const cacheKey = buildTtsCacheKey({
        voice: finalVoice,
        format,
        speed: finalSpeed,
        volume: finalVolume,
        afChain: finalAfChain,
        finalizeChain,
        vst: finalVst,
        instructions: finalInstructions,
        text: cleanText,
      });

      if (ttsCache.has(cacheKey)) {
        response.setHeader("Content-Type", contentType);
        response.setHeader("Cache-Control", "private, max-age=3600");
        response.send(ttsCache.get(cacheKey));
        return;
      }

      const openaiBody = {
        //model: "gpt-4o-mini-tts",
        model: "gpt-4o-mini-tts-2025-03-20",
        voice: finalVoice,
        input: cleanText,
        instructions: finalInstructions,
        response_format: format,
      };
      if (finalSpeed !== null) openaiBody.speed = finalSpeed;

      const openaiRes = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(openaiBody),
      });

      if (!openaiRes.ok) {
        const errText = await openaiRes.text().catch(() => "");
        console.error("[/api/tts] OpenAI error:", openaiRes.status, errText);
        let detail = "Audio generation failed.";
        try {
          const parsed = JSON.parse(errText);
          if (parsed?.error?.message) detail = parsed.error.message;
        } catch {}
        response.status(502).json({ ok: false, error: detail });
        return;
      }

      const rawBuffer = Buffer.from(await openaiRes.arrayBuffer());

      // VST insert pipeline: FFmpeg pre → MrsWatson → FFmpeg finalize. Failures
      // here are surfaced (so setup issues are visible) rather than silently
      // falling back, since the user explicitly asked for the plugin.
      if (finalVst) {
        try {
          const inExt = TTS_FORMAT_EXT[format] || "mp3";
          const wavIn = await ffmpegDecodeToWav(rawBuffer, inExt, finalAfChain);
          const wavVst = await applyMrsWatson(wavIn, {
            hostPath: finalVst.hostPath,
            plugin: finalVst.plugin,
            params: finalVst.params,
          });
          const out = await ffmpegEncodeFromWav(wavVst, format, finalizeChain);
          ttsSetCache(cacheKey, out);
          response.setHeader("Content-Type", contentType);
          response.setHeader("Cache-Control", "private, max-age=3600");
          response.send(out);
        } catch (err) {
          console.error("[/api/tts] VST pipeline failed:", err.message);
          response.status(502).json({ ok: false, error: `VST processing failed: ${err.message}` });
        }
        return;
      }

      // When a custom FX chain is supplied, it already includes loudnorm/limiter/
      // volume, so we run it instead of the default loudnorm pass. Either path
      // falls back to the raw OpenAI audio if FFmpeg fails.
      const buffer = finalAfChain
        ? await applyFfmpegChain(rawBuffer, format, finalAfChain).catch((err) => {
            console.warn("[/api/tts] ffmpeg chain failed, using raw audio:", err.message);
            return rawBuffer;
          })
        : await applyLoudnorm(rawBuffer, format, finalVolume).catch((err) => {
            console.warn("[/api/tts] loudnorm failed, using raw audio:", err.message);
            return rawBuffer;
          });
      ttsSetCache(cacheKey, buffer);

      response.setHeader("Content-Type", contentType);
      response.setHeader("Cache-Control", "private, max-age=3600");
      response.send(buffer);
    } catch (error) {
      next(error);
    }
  });

  // ── User preset persistence (file-backed, survives browser clears) ──────────
  const userPresetsFile = USER_PRESETS_FILE;

  app.get("/api/tts/presets", (_request, response) => {
    try {
      if (!existsSync(userPresetsFile)) { response.json([]); return; }
      const raw = readFileSync(userPresetsFile, "utf8");
      const parsed = JSON.parse(raw);
      response.json(Array.isArray(parsed) ? parsed : []);
    } catch {
      response.json([]);
    }
  });

  app.post("/api/tts/presets", (request, response) => {
    try {
      const presets = request.body;
      if (!Array.isArray(presets)) { response.status(400).json({ ok: false, error: "Body must be an array." }); return; }
      writeFileSync(userPresetsFile, JSON.stringify(presets, null, 2), "utf8");
      response.json({ ok: true });
    } catch (err) {
      response.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post("/api/ladspa/controls", async (request, response) => {
    try {
      const { file, plugin } = request.body || {};
      const okStr = (v, max) => typeof v === "string" && v.length <= max && !/[\r\n\0]/.test(v);
      if (!okStr(plugin, 512) || !plugin.trim()) {
        response.status(400).json({ ok: false, error: "plugin is required." });
        return;
      }
      if (file != null && !okStr(file, 512)) {
        response.status(400).json({ ok: false, error: "invalid file." });
        return;
      }
      const lib = (file && file.trim()) || plugin.trim();
      const controls = await introspectLadspa(lib, plugin.trim());
      response.json({ ok: true, plugin: plugin.trim(), controls });
    } catch (error) {
      response.status(502).json({ ok: false, error: error.message });
    }
  });

  registerKbDebugRoutes(app, kbService);

  app.use((error, request, response, next) => {
    response.status(error.statusCode || 500).json({
      error: error.message || "Unexpected server error."
    });
  });

  return app;
}

async function respondWithRuntime(
  { config, portalService, summarizer, parser, asker, teamGptAuthService, testerConfig },
  action
) {
  if (!hasTesterConfigOverrides(testerConfig)) {
    return action({
      effectiveConfig: config,
      portalService,
      summarizer,
      parser,
      asker,
      usingTesterConfig: false
    });
  }

  const effectiveConfig = buildConfig(testerConfig);
  const runtimePortalService = createPortalService(effectiveConfig);
  const runtimeTeamGptAuthService = createTeamGptAuthService(effectiveConfig);
  const runtimeSummarizer = createSummarizer(effectiveConfig, {
    teamGptAuthService: runtimeTeamGptAuthService
  });
  const runtimeParser = createPortalParser(effectiveConfig, {
    teamGptAuthService: runtimeTeamGptAuthService
  });
  const runtimeAsker = createAskService(effectiveConfig, {
    teamGptAuthService: runtimeTeamGptAuthService
  });

  try {
    return await action({
      effectiveConfig,
      portalService: runtimePortalService,
      summarizer: runtimeSummarizer,
      parser: runtimeParser,
      asker: runtimeAsker,
      usingTesterConfig: true
    });
  } finally {
    await runtimeTeamGptAuthService.dispose();
    await runtimePortalService.dispose();
  }
}

async function buildPreviewPayload({
  portalService,
  summarizer,
  includeSummary,
  focus,
  summaryProvider,
  summaryTone
}) {
  const snapshot = await portalService.fetchSnapshot();
  const summary = includeSummary
    ? await summarizer.summarize(snapshot, focus, {
        provider: summaryProvider,
        tone: summaryTone
      })
    : null;

  return {
    snapshot: portalService.toClientSnapshot(snapshot),
    summary
  };
}

async function buildParserPayload({
  portalService,
  parser,
  graphAuth,
  emailContextSummarizer,
  focus,
  testchat,
  model,
  provider,
  tone
}) {
  const snapshot = await portalService.fetchSnapshot();
  await tryEnrichSnapshot(graphAuth, emailContextSummarizer, snapshot);
  const parsed = await parser.parseSnapshot(snapshot, {
    focus,
    testchat,
    model,
    provider,
    tone
  });

  return {
    snapshot: portalService.toClientSnapshot(snapshot),
    parser: parsed
  };
}

// Resolves the effective ask provider (explicit request body beats config),
// then dispatches: "orchestrator" → deterministic router; "local" → archived
// unless the legacy flag is set; anything else → the legacy ask service.
// Every branch returns the legacy fields (enabled/provider/model/reason/
// prompt/answer/debug) plus the additive blocks/sources/toolTrace/route.
async function buildAskPayload({ config, orchestrator, asker, prompt, model, provider, threadId }) {
  const requested = typeof provider === "string" ? provider.trim().toLowerCase() : "";
  const resolved = requested || config?.askProvider || "";

  if (resolved === "orchestrator" && orchestrator) {
    const result = await orchestrator.ask({ prompt });
    return {
      enabled: true,
      provider: result.provider,
      model: result.model ?? null,
      reason: null,
      prompt,
      answer: result.answer,
      blocks: result.blocks,
      sources: result.sources,
      toolTrace: result.toolTrace,
      route: result.route,
      debug: {
        ...(result.debug ?? {}),
        provider: result.provider,
        endpoint: "/api/ask",
        mode: "orchestrator",
        route: result.route,
        responseVersion: "2026-07-ask-v2"
      }
    };
  }

  if (resolved === "local" && !config?.legacyLocalRagEnabled) {
    const reason =
      "Local ask is archived. Set LEGACY_LOCAL_RAG_ENABLED=true in .env to re-enable it.";
    return {
      enabled: false,
      provider: "local",
      model: null,
      reason,
      prompt,
      answer: reason,
      blocks: [textBlock(reason)],
      sources: [],
      toolTrace: [],
      route: "legacy_local",
      debug: { provider: "local", endpoint: "/api/ask", mode: "direct" }
    };
  }

  const legacy = await asker.ask(prompt, {
    model,
    provider,
    threadId
  });
  return {
    ...legacy,
    blocks:
      typeof legacy?.answer === "string" && legacy.answer ? [textBlock(legacy.answer)] : [],
    sources: [],
    toolTrace: [],
    route: `legacy_${legacy?.provider ?? "unknown"}`
  };
}

async function buildDashboardPayload({
  portalService,
  summarizer,
  parser,
  graphAuth,
  emailContextSummarizer,
  includeSummary,
  focus,
  summaryProvider,
  summaryTone,
  parserFocus,
  parserTestchat,
  model,
  parserProvider
}) {
  const snapshot = await portalService.fetchSnapshot();
  await tryEnrichSnapshot(graphAuth, emailContextSummarizer, snapshot);
  const [summary, parsed] = await Promise.all([
    includeSummary
      ? summarizer.summarize(snapshot, focus, {
          provider: summaryProvider,
          tone: summaryTone
        })
      : Promise.resolve(null),
    parser.parseSnapshot(snapshot, {
      focus: parserFocus,
      testchat: parserTestchat,
      model,
      provider: parserProvider,
      tone: summaryTone
    })
  ]);

  return {
    snapshot: portalService.toClientSnapshot(snapshot),
    summary,
    parser: parsed
  };
}

function normalizeAskPrompt(value) {
  return typeof value === "string" ? value.trim() : "";
}

function firstQueryValue(value) {
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0].trim() : "";
  }
  return typeof value === "string" ? value.trim() : "";
}

function normalizeAssistantChatLogMessages(messages) {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages
    .filter(
      (message) =>
        message &&
        (message.role === "user" || message.role === "assistant") &&
        typeof message.content === "string"
    )
    .map((message) => ({
      role: message.role,
      content: message.content,
    }))
    .slice(-20);
}

function buildAssistantChatLogEntry({ messages, responsePayload }) {
  return {
    kind: "assistant-chat-exchange",
    messages,
    response: {
      content: responsePayload?.content ?? "",
      answer: responsePayload?.answer ?? "",
      blocks: Array.isArray(responsePayload?.blocks)
        ? responsePayload.blocks
        : [],
      sources: Array.isArray(responsePayload?.sources)
        ? responsePayload.sources
        : [],
      proposedActions: Array.isArray(responsePayload?.proposedActions)
        ? responsePayload.proposedActions
        : [],
      toolTrace: Array.isArray(responsePayload?.toolTrace)
        ? responsePayload.toolTrace
        : [],
      provider: responsePayload?.provider ?? "",
      route: responsePayload?.route ?? "",
      model: responsePayload?.model ?? "",
      modelMode: responsePayload?.modelMode ?? "",
    },
  };
}

function normalizeTeamGptEndpointUrl(value) {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : config.teamGptEndpointUrl;
}

function normalizeTeamGptHeaders(value) {
  if (!value || typeof value !== "object") {
    return {};
  }

  const headers = {};
  for (const [key, entryValue] of Object.entries(value)) {
    if (typeof entryValue !== "string") {
      continue;
    }

    const normalizedKey = String(key || "").trim();
    const normalizedValue = entryValue.trim();
    if (!normalizedKey || !normalizedValue) {
      continue;
    }

    headers[normalizedKey] = normalizedValue;
  }

  return headers;
}

function buildTokenPreview(authorizationHeader = "") {
  const rawToken = authorizationHeader.startsWith("Bearer ")
    ? authorizationHeader.slice(7).trim()
    : authorizationHeader.trim();

  if (!rawToken) {
    return "";
  }

  if (rawToken.length <= 24) {
    return rawToken;
  }

  return `${rawToken.slice(0, 12)}...${rawToken.slice(-8)}`;
}

async function tryEnrichSnapshot(graphAuth, emailContextSummarizer, snapshot) {
  if (!graphAuth || !Array.isArray(snapshot?.records)) return;
  try {
    const token = await graphAuth.getAccessToken();
    const before = snapshot.records.length;
    snapshot.records = await enrichRecordsWithEmail(token, snapshot.records, {
      summarize: emailContextSummarizer?.summarize.bind(emailContextSummarizer),
    });
    const enriched = snapshot.records.filter((r) => r.emailContext).length;
    console.log(`[email-enrichment] ${enriched}/${before} records enriched with email context`);
  } catch (error) {
    console.warn("[email-enrichment] skipped:", error.message);
  }
}
