// GennyStudio/KB provider — the orchestrator's default answer engine.
// aris_search returns a finished, user-facing answer, so its text is used
// VERBATIM for direct KB answers. Explicit follow-up transformations may chain
// the result through TeamGPT. Falls back to raw KB
// excerpts (callKBX.cfm) when GennyStudio is disabled, empty, or erroring.

import { collectKbResearch } from "../../kb/research.js";
import { augmentPromptForBambooImages } from "../../assistant/bambooImageHooks.js";
import { textBlock, tableBlock } from "../responseBlocks.js";

const HISTORY_TURNS = 3;
const HISTORY_TURN_MAX_CHARS = 400;

export function createGennyStudioKbProvider({ gennyStudioService, kbService, kbUploadMarker = "" }) {
  return {
    providerName: "gennystudio",

    async run({ prompt, history = [], options = {} }) {
      const toolTrace = [];
      const gstudioStatus = safeDescribe(gennyStudioService);

      if (gstudioStatus.enabled) {
        try {
          const invokeArgs = {
            prompt: buildPrompt(prompt, history, kbUploadMarker),
            sessionId: options.sessionId || ""
          };
          const invokeOptions = options.authToken ? { authToken: options.authToken } : {};
          const result = await gennyStudioService.invoke(invokeArgs, invokeOptions);
          const text = typeof result?.text === "string" ? result.text.trim() : "";

          toolTrace.push({
            tool: "gstudio_invoke",
            args: { agentRef: result?.agentRef },
            resultSummary: text
              ? `Genny Studio returned ${text.length} chars.`
              : "Genny Studio returned an empty response."
          });

          if (text) {
            return {
              providerName: "gennystudio",
              answer: text,
              blocks: [textBlock(text)],
              sources: [
                {
                  type: "kb",
                  title: `Genny Studio (${result?.agentRef || "aris_search"})`,
                  path: `gstudio:${result?.agentRef || "aris_search"}`,
                  snippet: text.slice(0, 500)
                }
              ],
              toolTrace,
              debug: { gstudioSessionId: result?.sessionId || "" }
            };
          }
        } catch (error) {
          toolTrace.push({
            tool: "gstudio_invoke",
            resultSummary: `error: ${error?.message || "Genny Studio request failed."}`
          });
        }
      } else {
        toolTrace.push({
          tool: "gstudio_invoke",
          resultSummary: "skipped: Genny Studio is not configured/enabled."
        });
      }

      return runKbFallback({ prompt, kbService, kbUploadMarker, toolTrace, options });
    }
  };
}

async function runKbFallback({ prompt, kbService, kbUploadMarker, toolTrace, options }) {
  try {
    // The user's uploaded KB docs always contain the marker string, so
    // including it scopes the raw-KB search to those uploads instead of the
    // whole org KB.
    const marker = typeof kbUploadMarker === "string" ? kbUploadMarker.trim() : "";
    const primarySearchTerm = [marker, (prompt || "").slice(0, 80)]
      .filter(Boolean)
      .join(" ");
    const { trail, evidenceBlocks } = await collectKbResearch({
      kbService,
      itemContext: "",
      primarySearchTerm,
      kbAuthToken: options.authToken || ""
    });

    for (const entry of trail) {
      toolTrace.push({ tool: entry.tool || "kb_search", resultSummary: entry.summary || "" });
    }

    if (Array.isArray(evidenceBlocks) && evidenceBlocks.length > 0) {
      const answer =
        "Genny Studio was unavailable, so here are raw Knowledge Base excerpts that may help.";
      const blocks = [
        textBlock(answer),
        tableBlock({
          title: "Knowledge Base excerpts",
          columns: ["Source", "Location", "Excerpt"],
          rows: evidenceBlocks.map((block) => [
            block.label || block.source || "KB",
            block.location || block.webUrl || "",
            typeof block.snippets === "string" ? block.snippets.slice(0, 300) : ""
          ])
        })
      ];
      return {
        providerName: "gennystudio",
        answer,
        blocks,
        sources: evidenceBlocks.map((block) => ({
          type: "kb",
          title: block.label || "Knowledge Base",
          path: block.webUrl || block.location || "kb",
          snippet: typeof block.snippets === "string" ? block.snippets.slice(0, 500) : ""
        })),
        toolTrace
      };
    }
  } catch (error) {
    toolTrace.push({
      tool: "kb_search",
      resultSummary: `error: ${error?.message || "KB fallback failed."}`
    });
  }

  const answer =
    "No answer found. Genny Studio and the Knowledge Base returned nothing for this question — check GENNYSTUDIO_* settings and TeamGPT auth (GET /api/teamgpt/auth), or rephrase the question.";
  return {
    providerName: "gennystudio",
    answer,
    blocks: [textBlock(answer)],
    sources: [],
    toolTrace
  };
}

function buildPrompt(prompt, history, kbUploadMarker = "") {
  const enhancedPrompt = augmentPromptForBambooImages(prompt);
  // The user's own uploaded reference docs (org charts, scopes, context
  // packages) all carry this marker in the KB. A plain-language question like
  // "super group a" ranks poorly against the whole org KB, so tell the agent
  // where to look when the direct search comes up dry.
  const marker = typeof kbUploadMarker === "string" ? kbUploadMarker.trim() : "";
  const markerHint = marker
    ? `\n\n(If the direct search finds nothing, also search the Knowledge Base for "${marker}" — the user's uploaded reference documents, including org charts and Super Group data, all contain that marker.)`
    : "";
  const turns = (Array.isArray(history) ? history : [])
    .filter(
      (m) =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim()
    )
    // Drop the latest user turn — it IS the prompt.
    .slice(0, -1)
    .slice(-HISTORY_TURNS)
    .map(
      (m) =>
        `${m.role === "user" ? "User" : "Assistant"}: ${m.content.trim().slice(0, HISTORY_TURN_MAX_CHARS)}`
    );

  if (turns.length === 0) {
    return `${enhancedPrompt}${markerHint}`;
  }
  return `Recent conversation:\n${turns.join("\n")}\n\nQuestion:\n${enhancedPrompt}${markerHint}`;
}

function safeDescribe(service) {
  try {
    const described = service?.describe?.();
    return described && typeof described === "object" ? described : { enabled: false };
  } catch {
    return { enabled: false };
  }
}
