import express from "express";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { writeFileSync, readFileSync, rmSync, existsSync } from "node:fs";
import { join, delimiter, dirname, basename } from "node:path";
import { tmpdir } from "node:os";
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
import { enrichRecordsWithEmail } from "./services/graph/itemEmailEnricher.js";
import { registerKbDebugRoutes } from "./services/kb/debugRoutes.js";
import { runResearchPipeline } from "./services/sourcebot/researchPipeline.js";
import { createTeamGptAuthService } from "./services/teamgpt/auth.js";

const publicDirectory = fileURLToPath(new URL("../../public/", import.meta.url));

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
const ttsCache = new Map();

function cleanTtsText(text) {
  return text
    .replace(/<[^>]+>/g, " ")
    .replace(/[#*_`~[\]]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, TTS_MAX_CHARS);
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
const lucideDirectory = fileURLToPath(
  new URL("../../node_modules/lucide/dist/esm/", import.meta.url)
);

export function createApp({ config, portalService, summarizer, parser, asker, graphAuth, emailContextSummarizer, kbService, sourcebotService, docsKbService, teamGptAuthService }) {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));
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
              sourcebot: sourcebotService?.describe() ?? { enabled: false },
              docsKb: docsKbService?.describe() ?? { enabled: false }
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
            asker: runtimeAsker,
            prompt,
            model: request.body?.model,
            provider: request.body?.provider,
            threadId: request.body?.threadId
          });

          response.json(payload);
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

  app.post("/api/item/research", async (request, response, next) => {
    try {
      const canUseSourcebot = Boolean(sourcebotService?.enabled);
      const kbStatus = kbService?.describe?.() ?? { enabled: false, authConfigured: false };
      const canUseKb =
        Boolean(kbStatus.enabled) &&
        Boolean(kbStatus.authConfigured || request.headers.authorization);
      const canUseDocs = Boolean(docsKbService?.describe?.()?.enabled);

      if (!canUseSourcebot && !canUseKb && !canUseDocs) {
        response.status(503).json({ ok: false, error: "No research sources are configured (Sourcebot, KB, or Docs)." });
        return;
      }

      const { query, messages = [], itemContext = "" } = request.body || {};
      if (!query || typeof query !== "string" || !query.trim()) {
        response.status(400).json({ ok: false, error: "query is required." });
        return;
      }

      const result = await runResearchPipeline({
        sourcebotService,
        kbService,
        docsKbService,
        config,
        itemContext,
        userQuery: query.trim(),
        messages,
        teamGptAuthService,
        kbAuthToken: request.headers.authorization,
      });

      response.json({
        ok: true,
        report: result.report,
        codeFindings: result.codeFindings,
        kbFindings: result.kbFindings,
        docsFindings: result.docsFindings,
        chatUrl: result.chatUrl,
        retrievalTrail: result.retrievalTrail,
      });
    } catch (error) {
      console.error("[/api/item/research]", error);
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
      const finalInstructions = (typeof reqInstructions === "string" && reqInstructions.trim()) ? reqInstructions.trim() : preset.instructions;
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

async function buildAskPayload({ asker, prompt, model, provider, threadId }) {
  return asker.ask(prompt, {
    model,
    provider,
    threadId
  });
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
