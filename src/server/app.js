import express from "express";
import { fileURLToPath } from "node:url";
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
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
import { runResearchPipeline } from "./services/sourcebot/researchPipeline.js";
import { createTeamGptAuthService } from "./services/teamgpt/auth.js";
import { buildFriendlyCapabilities } from "./services/graph/assistantCapabilities.js";
import { textBlock } from "./services/orchestrator/responseBlocks.js";
import { appendAssistantConversationLog } from "./services/assistant/conversationLog.js";


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


export function createApp({ config, portalService, summarizer, parser, asker, graphAuth, emailContextSummarizer, kbService, gennyStudioService, sourcebotService, teamGptAuthService, assistantModelProvider, assistantPendingActionStore, assistantBambooImageHooks, assistantController, orchestrator, executiveDayOrganizer }) {
  const app = express();
  const rewriteAssistantPayload = ({ prompt, payload }) =>
    assistantBambooImageHooks?.rewriteAssistantPayload
      ? assistantBambooImageHooks.rewriteAssistantPayload({ prompt, payload })
      : payload;

  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));

  // OpenAI Realtime chat is archived; no realtime session route is registered.

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
              sourcebot: sourcebotService?.describe() ?? { enabled: false }
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

          // The text assistant and supporting clients ask through this route, so it needs the
          // same Bamboo image rewrite (proxy URLs + renderable image markup)
          // as /api/assistant/chat.
          response.json(rewriteAssistantPayload({ prompt, payload }));
        }
      );
    } catch (error) {
      next(error);
    }
  });

  // Auth health check. JWT material stays server-side and is never returned
  // to the browser or API caller.
  app.get("/api/teamgpt/auth", async (request, response, next) => {
    try {
      const authPayload = await teamGptAuthService.getJwtToken();
      response.json({
        ok: true,
        authenticated: true,
        pageUrl: authPayload.pageUrl,
        endpointConfigured: Boolean(config.teamGptEndpointUrl),
        appIdConfigured: Boolean(config.teamGptAppId),
        environment: config.teamGptEnvironment
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
            // args without flooding the assistant context.
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
            `${service}.${functionName} changes live Microsoft 365 data. Read the exact change back to the user, ` +
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
      const embeddings = {
        docs: { enabled: false, mode: null, model: null },
        code: { enabled: false, mode: null, model: null },
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

      response.json({
        ok: true,
        chat: await assistantModelProvider.describe(),
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

  // Text assistant chat. The default deterministic orchestrator handles KB,
  // code, summaries, research, and Graph routing. Optional cloud mode keeps a
  // capability-gated Graph tool loop. Mutations always require confirmation.
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
          provider: assistantModelProvider.provider || "cloud",
          route: "cloud_graph_tools"
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

      if (!canUseSourcebot && !canUseKb && !canUseGstudio) {
        response.status(503).json({ ok: false, error: "No research sources are configured (GennyStudio, Sourcebot, or KB)." });
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
        chatUrl: result.chatUrl,
        retrievalTrail: result.retrievalTrail,
        gstudioSessionId: result.gstudioSessionId || "",
      });
    } catch (error) {
      console.error("[/api/item/research]", error);
      next(error);
    }
  });



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
// then dispatches to the orchestrator or the direct OpenAI/TeamGPT ask service.
// Every branch returns the common fields plus blocks/sources/toolTrace/route.
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


  const direct = await asker.ask(prompt, {
    model,
    provider,
    threadId
  });
  return {
    ...direct,
    blocks:
      typeof direct?.answer === "string" && direct.answer ? [textBlock(direct.answer)] : [],
    sources: [],
    toolTrace: [],
    route: `direct_${direct?.provider ?? "unknown"}`
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
      provider:
        typeof message.provider === "string" ? message.provider.slice(0, 80) : "",
      route: typeof message.route === "string" ? message.route.slice(0, 80) : "",
      sources: Array.isArray(message.sources)
        ? message.sources.slice(0, 12).map((source) => ({
            type: typeof source?.type === "string" ? source.type.slice(0, 40) : "kb",
            title: typeof source?.title === "string" ? source.title.slice(0, 240) : "",
            path: typeof source?.path === "string" ? source.path.slice(0, 1000) : "",
            snippet:
              typeof source?.snippet === "string" ? source.snippet.slice(0, 500) : "",
          }))
        : [],
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
