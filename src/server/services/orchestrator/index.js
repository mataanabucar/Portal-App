// Deterministic orchestrator: routes each question with the keyword intent
// router (no model involved), fans out to GennyStudio/KB, TeamGPT, Sourcebot,
// Graph, or the research pipeline, and returns the shared block contract.
//
// OpenAI policy (see docs/orchestrator.md): OpenAI never routes, never
// answers KB questions. Direct aris_search answers stay verbatim; TeamGPT only
// transforms them when the user explicitly requests a chained operation. The only two
// opt-in OpenAI hooks are the R8-fallback general-chat answer
// (ORCHESTRATOR_OPENAI_FALLBACK_ENABLED) and ambiguous-routing clarification
// (ORCHESTRATOR_OPENAI_CLARIFY_ENABLED) — both default off.

import { randomUUID } from "node:crypto";
import OpenAI from "openai";
import { routeIntent, ROUTES } from "./intentRouter.js";
import {
  actionsBlock,
  buildOrchestratorResponse,
  summaryBlock,
  textBlock
} from "./responseBlocks.js";
import { createTeamGptTasks } from "../teamgpt/tasks.js";
import { createGennyStudioKbProvider } from "./providers/gennyStudioKbProvider.js";
import { createSourcebotProvider } from "./providers/sourcebotProvider.js";
import { createGraphProvider } from "./providers/graphProvider.js";
import { createTeamGptProvider } from "./providers/teamGptProvider.js";
import { createResearchProvider } from "./providers/researchProvider.js";
import { createContextTransformProvider } from "./providers/contextTransformProvider.js";

const NO_ANSWER_MARKERS = [
  "No answer found.",
  "Genny Studio was unavailable"
];

export function createOrchestrator(
  config,
  {
    gennyStudioService,
    sourcebotService,
    kbService,
    graphAuth,
    teamGptAuthService,
    pendingActionStore,
    // Test seam: inject pre-built TeamGPT tasks instead of constructing them.
    teamGptTasks: injectedTeamGptTasks
  }
) {
  const teamGptTasks =
    injectedTeamGptTasks ?? createTeamGptTasks(config, teamGptAuthService);

  const gennyStudioKbProvider = createGennyStudioKbProvider({
    gennyStudioService,
    kbService,
    kbUploadMarker: config.kbUploadMarker
  });
  const sourcebotProvider = createSourcebotProvider({ sourcebotService });
  const graphProvider = createGraphProvider({ graphAuth, pendingActionStore });
  const teamGptProvider = teamGptTasks
    ? createTeamGptProvider({ teamGptTasks })
    : null;
  const researchProvider = createResearchProvider({
    sourcebotService,
    kbService,
    gennyStudioService,
    config,
    teamGptAuthService
  });
  const contextTransformProvider = createContextTransformProvider({ teamGptTasks });

  const openAiClient =
    (config.orchestratorOpenAiFallbackEnabled || config.orchestratorOpenAiClarifyEnabled) &&
    config.openAiApiKey
      ? new OpenAI({ apiKey: config.openAiApiKey })
      : null;

  function describe() {
    return {
      enabled: true,
      mode: "orchestrator",
      providers: {
        gennystudio: safeDescribe(gennyStudioService),
        sourcebot: safeDescribe(sourcebotService),
        teamgpt: Boolean(teamGptTasks),
        graph: Boolean(graphAuth),
        research: Boolean(sourcebotService || kbService || gennyStudioService),
        contextTransform: Boolean(teamGptTasks)
      },
      openAiFallbackEnabled: Boolean(config.orchestratorOpenAiFallbackEnabled && openAiClient),
      openAiClarifyEnabled: Boolean(config.orchestratorOpenAiClarifyEnabled && openAiClient)
    };
  }

  async function ask({ prompt, history = [], itemContext = "", sessionId = "", authToken = "" } = {}) {
    const cleanPrompt = typeof prompt === "string" ? prompt.trim() : "";
    const requestId = randomUUID();

    if (!cleanPrompt) {
      return buildOrchestratorResponse({
        route: "invalid",
        provider: "orchestrator",
        answer: "A question is required.",
        toolTrace: [],
        debug: { requestId }
      });
    }

    const routerResult = routeIntent({ prompt: cleanPrompt, history, itemContext });
    const toolTrace = [
      {
        tool: "intent_router",
        args: {
          route: routerResult.route,
          matchedKeywords: routerResult.matchedKeywords,
          providedText: Boolean(routerResult.providedText),
          graphIntent: routerResult.graphIntent?.kind,
          contextQueryTarget: routerResult.contextQuery?.target || ""
        },
        resultSummary: `routed to ${routerResult.route}`
      }
    ];

    const contextQueryChain = await deriveContextualToolQuery({
      prompt: cleanPrompt,
      history,
      routerResult,
      teamGptTasks
    });
    toolTrace.push(...contextQueryChain.toolTrace);

    const effectivePrompt = contextQueryChain.prompt;
    const effectiveRouterResult = contextQueryChain.routerResult;

    const isAmbiguousFallback =
      routerResult.route === ROUTES.DOCS_KB && routerResult.matchedKeywords.length === 0;

    const { provider, degradedFrom } = pickProvider(effectiveRouterResult);
    if (degradedFrom) {
      toolTrace.push({
        tool: "intent_router",
        resultSummary: `provider "${degradedFrom}" unavailable — degraded to gennystudio.`
      });
    }

    let result;
    try {
      result = await provider.run({
        prompt: effectivePrompt,
        history,
        routerResult: effectiveRouterResult,
        options: { itemContext, sessionId, authToken }
      });
    } catch (error) {
      // Providers are written to never throw; this is the belt-and-suspenders.
      const answer = `The "${provider.providerName}" provider failed unexpectedly: ${error?.message || "unknown error"}.`;
      result = {
        providerName: provider.providerName,
        answer,
        blocks: [textBlock(answer)],
        sources: [],
        toolTrace: [{ tool: provider.providerName, resultSummary: `error: ${answer}` }]
      };
    }

    if (contextQueryChain.applied) {
      result = {
        ...result,
        sources: mergeSourceLists(
          contextQueryChain.priorSources,
          [teamGptSource(contextQueryChain.model, "TeamGPT query derivation")],
          result.sources
        )
      };
    }

    let combinedTrace = [...toolTrace, ...(result.toolTrace || [])];
    let finalResult = result;
    let providerName = result.providerName || provider.providerName;
    if (contextQueryChain.applied) {
      providerName = `teamgpt+${providerName}`;
    }
    let route = routerResult.route;

    if (routerResult.postProcess) {
      const chained = await applyTeamGptPostProcess({
        result: finalResult,
        postProcess: routerResult.postProcess,
        request: cleanPrompt,
        teamGptTasks
      });
      finalResult = chained.result;
      combinedTrace = [...combinedTrace, ...chained.toolTrace];
      if (chained.applied) {
        providerName = `${providerName}+teamgpt`;
      }
    }

    // Opt-in OpenAI hooks, ONLY on the R8 fallback route AND only after
    // GennyStudio/KB produced nothing usable — the KB always gets first shot.
    // Clarify (ask one disambiguating question) beats general-chat fallback
    // when both are enabled. Neither ever sees aris_search output.
    if (isAmbiguousFallback && openAiClient && isEmptyKbAnswer(result)) {
      if (config.orchestratorOpenAiClarifyEnabled) {
        const clarified = await runOpenAiClarify(cleanPrompt);
        if (clarified) {
          combinedTrace.push({
            tool: "openai_clarify",
            resultSummary:
              "KB found nothing on an ambiguous prompt — generated a clarification question."
          });
          providerName = "openai_clarify";
          route = "clarify";
          finalResult = {
            answer: clarified,
            blocks: [textBlock(clarified)],
            sources: [],
            model: config.openAiModel
          };
        }
      } else if (config.orchestratorOpenAiFallbackEnabled) {
        const fallback = await runOpenAiFallback(cleanPrompt);
        if (fallback) {
          combinedTrace.push({
            tool: "openai_fallback",
            resultSummary:
              "KB returned nothing on the fallback route — answered via OpenAI general chat."
          });
          providerName = "openai_fallback";
          route = "openai_fallback";
          finalResult = {
            answer: fallback,
            blocks: [textBlock(fallback)],
            sources: [],
            model: config.openAiModel
          };
        }
      }
    }

    return buildOrchestratorResponse({
      route,
      provider: providerName,
      answer: finalResult.answer,
      blocks: finalResult.blocks,
      sources: finalResult.sources,
      toolTrace: combinedTrace,
      model: finalResult.model ?? null,
      debug: { requestId, ...(finalResult.debug || {}) }
    });
  }

  function pickProvider(routerResult) {
    switch (routerResult.route) {
      case ROUTES.SUMMARY_TEXT:
      case ROUTES.SUMMARY_CONVERSATION:
      case ROUTES.ACTION_ITEMS:
        if (teamGptProvider) {
          return { provider: teamGptProvider };
        }
        return { provider: gennyStudioKbProvider, degradedFrom: "teamgpt" };
      case ROUTES.CONTEXT_TRANSFORM:
        return { provider: contextTransformProvider };
      case ROUTES.GRAPH:
        // graphProvider itself degrades gracefully (guidance text) when auth
        // is missing, which is more honest than answering mail questions
        // from the KB.
        return { provider: graphProvider };
      case ROUTES.CODE:
        if (sourcebotService?.enabled) {
          return { provider: sourcebotProvider };
        }
        return { provider: gennyStudioKbProvider, degradedFrom: "sourcebot" };
      case ROUTES.RESEARCH:
        return { provider: researchProvider };
      case ROUTES.DOCS_KB:
      default:
        return { provider: gennyStudioKbProvider };
    }
  }

  async function runOpenAiClarify(prompt) {
    try {
      const response = await openAiClient.responses.create({
        model: config.openAiModel,
        instructions:
          "The user's request could not be routed to a specific capability (documents/KB, code search, Microsoft 365, summaries, action items, research). Ask exactly ONE short clarifying question that would disambiguate what they want. Respond with only the question.",
        input: prompt,
        max_output_tokens: 100
      });
      const text = typeof response.output_text === "string" ? response.output_text.trim() : "";
      return text || null;
    } catch (error) {
      console.warn("[orchestrator] OpenAI clarify failed:", error?.message);
      return null;
    }
  }

  async function runOpenAiFallback(prompt) {
    try {
      const response = await openAiClient.responses.create({
        model: config.openAiModel,
        instructions:
          "You are a general-purpose assistant answering a question the internal knowledge base could not. Answer concisely. If the question is about internal company data you cannot know, say so plainly.",
        input: prompt,
        max_output_tokens: 600
      });
      const text = typeof response.output_text === "string" ? response.output_text.trim() : "";
      return text || null;
    } catch (error) {
      console.warn("[orchestrator] OpenAI fallback failed:", error?.message);
      return null;
    }
  }

  return { describe, ask };
}

async function deriveContextualToolQuery({
  prompt,
  history,
  routerResult,
  teamGptTasks
}) {
  const unchanged = {
    applied: false,
    prompt,
    routerResult,
    priorSources: [],
    model: null,
    toolTrace: []
  };

  const target = routerResult?.contextQuery?.target;
  if (!target) {
    return unchanged;
  }
  if (!teamGptTasks?.deriveToolQuery) {
    return {
      ...unchanged,
      toolTrace: [
        {
          tool: "teamgpt_derive_tool_query",
          args: { target },
          resultSummary:
            "skipped: TeamGPT query derivation is unavailable; used the original request."
        }
      ]
    };
  }

  const latestAssistant = findLatestAssistantMessage(history);
  const context = latestAssistant?.content?.trim().slice(0, 14000) || "";
  if (!context) {
    return {
      ...unchanged,
      toolTrace: [
        {
          tool: "teamgpt_derive_tool_query",
          args: { target },
          resultSummary: "skipped: no prior assistant answer was available."
        }
      ]
    };
  }

  try {
    const generated = await teamGptTasks.deriveToolQuery({
      target,
      request: prompt,
      context
    });
    const query = typeof generated?.text === "string" ? generated.text.trim() : "";
    if (!query) {
      throw new Error("TeamGPT returned an empty tool query.");
    }

    const effectiveRouterResult = {
      ...routerResult,
      residualPrompt: query
    };
    let effectivePrompt = prompt;

    if (routerResult.route === ROUTES.GRAPH) {
      effectiveRouterResult.graphIntent = {
        ...(routerResult.graphIntent || {}),
        query
      };
    } else if (routerResult.route === ROUTES.DOCS_KB) {
      // GennyStudio consumes the prompt directly rather than residualPrompt.
      effectivePrompt = query;
    }

    return {
      applied: true,
      prompt: effectivePrompt,
      routerResult: effectiveRouterResult,
      priorSources: Array.isArray(latestAssistant?.sources)
        ? latestAssistant.sources
        : [],
      model: generated?.model || null,
      toolTrace: [
        {
          tool: "teamgpt_derive_tool_query",
          args: {
            target,
            priorProvider: latestAssistant?.provider || "",
            priorRoute: latestAssistant?.route || ""
          },
          resultSummary: `Derived a ${query.length}-character ${target} query from the prior answer.`
        }
      ]
    };
  } catch (error) {
    return {
      ...unchanged,
      toolTrace: [
        {
          tool: "teamgpt_derive_tool_query",
          args: { target },
          resultSummary: `error: ${error?.message || "query derivation failed"}; used the original request.`
        }
      ]
    };
  }
}

async function applyTeamGptPostProcess({
  result,
  postProcess,
  request,
  teamGptTasks
}) {
  const toolTrace = [];
  if (!postProcess || !teamGptTasks) {
    if (postProcess && !teamGptTasks) {
      toolTrace.push({
        tool: "teamgpt_post_process",
        resultSummary: "skipped: TeamGPT unavailable; returned the primary tool result."
      });
    }
    return { result, toolTrace, applied: false };
  }

  const evidence = serializeToolEvidence(result);
  if (!evidence.trim()) {
    toolTrace.push({
      tool: "teamgpt_post_process",
      resultSummary: "skipped: the primary tool returned no usable evidence."
    });
    return { result, toolTrace, applied: false };
  }

  try {
    if (postProcess.kind === "action_items") {
      const extracted = await teamGptTasks.extractActionItems({ text: evidence });
      if (!Array.isArray(extracted.items)) {
        toolTrace.push({
          tool: "teamgpt_extract_from_tool_evidence",
          resultSummary: `warning: ${extracted.warning || "unparseable action items"}`
        });
        return { result, toolTrace, applied: false };
      }
      const answer = extracted.items.length
        ? `Extracted ${extracted.items.length} action item(s) from the ${result.providerName || "tool"} evidence.`
        : "No action items were found in the retrieved evidence.";
      toolTrace.push({
        tool: "teamgpt_extract_from_tool_evidence",
        args: { sourceProvider: result.providerName || "" },
        resultSummary: `Extracted ${extracted.items.length} item(s).`
      });
      return {
        result: {
          ...result,
          answer,
          blocks: [
            textBlock(answer),
            actionsBlock(extracted.items),
            ...supportingEvidenceBlocks(result.blocks)
          ],
          sources: appendTeamGptSource(result.sources, extracted.model),
          model: extracted.model
        },
        toolTrace,
        applied: true
      };
    }

    const generated = await teamGptTasks.synthesizeToolEvidence({
      request,
      evidence,
      mode: postProcess.kind === "summary" ? "summary" : "synthesize"
    });
    const answer = typeof generated?.text === "string" ? generated.text.trim() : "";
    if (!answer) {
      throw new Error("TeamGPT returned an empty synthesis.");
    }
    toolTrace.push({
      tool: "teamgpt_synthesize_tool_evidence",
      args: {
        sourceProvider: result.providerName || "",
        mode: postProcess.kind
      },
      resultSummary: `Synthesized ${evidence.length} evidence characters into ${answer.length} answer characters.`
    });
    return {
      result: {
        ...result,
        answer,
        blocks: [
          postProcess.kind === "summary"
            ? summaryBlock({ title: "Summary", text: answer })
            : textBlock(answer),
          ...supportingEvidenceBlocks(result.blocks)
        ],
        sources: appendTeamGptSource(result.sources, generated.model),
        model: generated.model
      },
      toolTrace,
      applied: true
    };
  } catch (error) {
    toolTrace.push({
      tool: "teamgpt_post_process",
      resultSummary: `error: ${error?.message || "TeamGPT post-processing failed."}; returned the primary tool result.`
    });
    return { result, toolTrace, applied: false };
  }
}

function serializeToolEvidence(result) {
  const lines = [];
  if (typeof result?.answer === "string" && result.answer.trim()) {
    lines.push(`Primary answer:\n${result.answer.trim()}`);
  }
  for (const block of Array.isArray(result?.blocks) ? result.blocks : []) {
    if (!block || typeof block !== "object") continue;
    if (block.type === "text" && block.text) {
      lines.push(String(block.text));
    } else if (block.type === "summary" && block.text) {
      lines.push(`${block.title || "Summary"}:\n${block.text}`);
    } else if (block.type === "table") {
      const columns = Array.isArray(block.columns) ? block.columns : [];
      const rows = Array.isArray(block.rows) ? block.rows : [];
      lines.push(
        [
          block.title || "Table",
          columns.join(" | "),
          ...rows.map((row) => (Array.isArray(row) ? row.join(" | ") : ""))
        ].join("\n")
      );
    } else if (block.type === "actions") {
      lines.push(
        `Actions:\n${(Array.isArray(block.items) ? block.items : [])
          .map((item) => JSON.stringify(item))
          .join("\n")}`
      );
    }
  }
  return lines.join("\n\n").slice(0, 20000);
}

function supportingEvidenceBlocks(blocks) {
  return (Array.isArray(blocks) ? blocks : []).filter(
    (block) =>
      block &&
      (block.type === "table" ||
        block.type === "actions" ||
        block.type === "image" ||
        block.type === "chart")
  );
}

function appendTeamGptSource(sources, model) {
  return mergeSourceLists(
    sources,
    [teamGptSource(model, "TeamGPT synthesis")]
  );
}

function teamGptSource(model, title) {
  return {
    type: "teamgpt",
    title,
    path: `teamgpt:${model || "default"}`,
    snippet: ""
  };
}

function mergeSourceLists(...sourceLists) {
  const merged = [];
  const seen = new Set();
  for (const source of sourceLists.flatMap((list) =>
    Array.isArray(list) ? list : []
  )) {
    if (!source || typeof source !== "object") continue;
    const normalized = {
      type: typeof source.type === "string" ? source.type : "kb",
      title: typeof source.title === "string" ? source.title : "",
      path: typeof source.path === "string" ? source.path : "",
      snippet:
        typeof source.snippet === "string" ? source.snippet.slice(0, 500) : ""
    };
    const key = `${normalized.type}:${normalized.path}:${normalized.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(normalized);
  }
  return merged;
}

function findLatestAssistantMessage(history) {
  const messages = Array.isArray(history) ? history : [];
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (
      message?.role === "assistant" &&
      typeof message.content === "string" &&
      message.content.trim()
    ) {
      return message;
    }
  }
  return null;
}

function isEmptyKbAnswer(result) {
  const answer = typeof result?.answer === "string" ? result.answer : "";
  return (
    !answer ||
    NO_ANSWER_MARKERS.some((marker) => answer.startsWith(marker))
  );
}

function safeDescribe(service) {
  try {
    const described = service?.describe?.();
    return described && typeof described === "object"
      ? described
      : { enabled: Boolean(service?.enabled) };
  } catch {
    return { enabled: false };
  }
}
