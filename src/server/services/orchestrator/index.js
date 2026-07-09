// Deterministic orchestrator: routes each question with the keyword intent
// router (no model involved), fans out to GennyStudio/KB, TeamGPT, Sourcebot,
// Graph, or the research pipeline, and returns the shared block contract.
//
// OpenAI policy (see docs/orchestrator.md): OpenAI never routes, never
// answers KB questions, and never touches aris_search output. The only two
// opt-in OpenAI hooks are the R8-fallback general-chat answer
// (ORCHESTRATOR_OPENAI_FALLBACK_ENABLED) and ambiguous-routing clarification
// (ORCHESTRATOR_OPENAI_CLARIFY_ENABLED) — both default off.

import { randomUUID } from "node:crypto";
import OpenAI from "openai";
import { routeIntent, ROUTES } from "./intentRouter.js";
import { buildOrchestratorResponse, textBlock } from "./responseBlocks.js";
import { createTeamGptTasks } from "../teamgpt/tasks.js";
import { createGennyStudioKbProvider } from "./providers/gennyStudioKbProvider.js";
import { createSourcebotProvider } from "./providers/sourcebotProvider.js";
import { createGraphProvider } from "./providers/graphProvider.js";
import { createTeamGptProvider } from "./providers/teamGptProvider.js";
import { createResearchProvider } from "./providers/researchProvider.js";

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
    docsKbService,
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
    docsKbService,
    config,
    teamGptAuthService
  });

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
        research: Boolean(sourcebotService || kbService || gennyStudioService)
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
          graphIntent: routerResult.graphIntent?.kind
        },
        resultSummary: `routed to ${routerResult.route}`
      }
    ];

    const isAmbiguousFallback =
      routerResult.route === ROUTES.DOCS_KB && routerResult.matchedKeywords.length === 0;

    const { provider, degradedFrom } = pickProvider(routerResult);
    if (degradedFrom) {
      toolTrace.push({
        tool: "intent_router",
        resultSummary: `provider "${degradedFrom}" unavailable — degraded to gennystudio.`
      });
    }

    let result;
    try {
      result = await provider.run({
        prompt: cleanPrompt,
        history,
        routerResult,
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

    let combinedTrace = [...toolTrace, ...(result.toolTrace || [])];
    let finalResult = result;
    let providerName = result.providerName || provider.providerName;
    let route = routerResult.route;

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
