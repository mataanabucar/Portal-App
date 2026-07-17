// Context-aware TeamGPT transformation provider. It converts prior assistant
// output into a requested artifact (for example, a Sourcebot prompt) rather
// than mistakenly treating the target tool name as a direct search request.

import { textBlock } from "../responseBlocks.js";

const MAX_CONTEXT_CHARS = 14000;
const MAX_CONVERSATION_CHARS = 8000;

export function createContextTransformProvider({ teamGptTasks }) {
  return {
    providerName: "teamgpt",

    async run({ prompt, history = [], routerResult }) {
      const toolTrace = [];
      if (!teamGptTasks) {
        const answer =
          "This request needs TeamGPT to transform the prior answer, but TeamGPT is not configured or authenticated.";
        toolTrace.push({
          tool: "teamgpt_context_transform",
          resultSummary: "skipped: TeamGPT unavailable."
        });
        return {
          providerName: "teamgpt",
          answer,
          blocks: [textBlock(answer)],
          sources: [],
          toolTrace
        };
      }

      const transformIntent = routerResult?.transformIntent || {
        kind: "transform_context",
        target: "text"
      };
      const latestAssistant = findLatestAssistantMessage(history);
      const context = latestAssistant?.content?.slice(0, MAX_CONTEXT_CHARS) || "";
      const conversationContext = buildConversationContext(history);

      try {
        const result =
          transformIntent.kind === "tool_prompt"
            ? await teamGptTasks.composeToolPrompt({
                target: transformIntent.target,
                request: prompt,
                context,
                conversationContext
              })
            : await teamGptTasks.transformContext({
                request: prompt,
                context,
                conversationContext
              });

        const answer = typeof result?.text === "string" ? result.text.trim() : "";
        if (!answer) {
          throw new Error("TeamGPT returned an empty transformation.");
        }

        toolTrace.push({
          tool:
            transformIntent.kind === "tool_prompt"
              ? "teamgpt_compose_tool_prompt"
              : "teamgpt_transform_context",
          args: {
            target: transformIntent.target,
            usedPriorAssistantContext: Boolean(context),
            priorProvider: latestAssistant?.provider || "",
            priorRoute: latestAssistant?.route || ""
          },
          resultSummary: `Generated ${answer.length} characters from recent conversation context.`
        });

        return {
          providerName: "teamgpt",
          answer,
          blocks: [textBlock(answer)],
          sources: mergeSources(latestAssistant?.sources, result?.model),
          toolTrace,
          model: result?.model
        };
      } catch (error) {
        const answer = `TeamGPT context transformation failed: ${error?.message || "unknown error"}. Check TeamGPT authentication.`;
        toolTrace.push({
          tool: "teamgpt_context_transform",
          resultSummary: `error: ${answer}`
        });
        return {
          providerName: "teamgpt",
          answer,
          blocks: [textBlock(answer)],
          sources: [],
          toolTrace
        };
      }
    }
  };
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

function buildConversationContext(history) {
  return (Array.isArray(history) ? history : [])
    .filter(
      (message) =>
        message &&
        (message.role === "user" || message.role === "assistant") &&
        typeof message.content === "string" &&
        message.content.trim()
    )
    .slice(-6)
    .map((message) => {
      const metadata = [message.provider, message.route].filter(Boolean).join("/");
      const label = message.role === "assistant" ? "Assistant" : "User";
      return `${label}${metadata ? ` (${metadata})` : ""}: ${message.content.trim()}`;
    })
    .join("\n\n")
    .slice(0, MAX_CONVERSATION_CHARS);
}

function mergeSources(priorSources, model) {
  const sources = [];
  const seen = new Set();
  for (const source of Array.isArray(priorSources) ? priorSources : []) {
    if (!source || typeof source !== "object") continue;
    const path = typeof source.path === "string" ? source.path : "";
    const title = typeof source.title === "string" ? source.title : path;
    const key = `${source.type || "kb"}:${path}:${title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    sources.push({
      type: source.type || "kb",
      title: title || "Prior assistant source",
      path,
      snippet: typeof source.snippet === "string" ? source.snippet.slice(0, 500) : ""
    });
  }
  sources.push({
    type: "teamgpt",
    title: "TeamGPT context transformation",
    path: `teamgpt:${model || "default"}`,
    snippet: ""
  });
  return sources;
}
