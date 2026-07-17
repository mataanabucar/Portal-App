// Research provider — wraps the existing research pipeline (aris_search-first,
// KB fallback, Sourcebot evidence) unchanged and maps its report into the
// shared block contract.

import { runResearchPipeline } from "../../sourcebot/researchPipeline.js";
import { textBlock, summaryBlock, actionsBlock } from "../responseBlocks.js";

export function createResearchProvider({
  sourcebotService,
  kbService,
  gennyStudioService,
  config,
  teamGptAuthService
}) {
  return {
    providerName: "research",

    async run({ prompt, history = [], options = {} }) {
      const toolTrace = [];

      let outcome;
      try {
        outcome = await runResearchPipeline({
          sourcebotService,
          kbService,
          gennyStudioService,
          config,
          itemContext: options.itemContext || "",
          userQuery: prompt,
          messages: history,
          teamGptAuthService,
          kbAuthToken: options.authToken || "",
          gstudioSessionId: options.sessionId || ""
        });
      } catch (error) {
        const answer = `Research failed: ${error?.message || "research pipeline error"}.`;
        toolTrace.push({ tool: "research_pipeline", resultSummary: `error: ${answer}` });
        return {
          providerName: "research",
          answer,
          blocks: [textBlock(answer)],
          sources: [],
          toolTrace
        };
      }

      for (const entry of outcome?.retrievalTrail || []) {
        toolTrace.push({
          tool: entry.tool || "research",
          resultSummary: entry.summary || ""
        });
      }

      const report = outcome?.report || {};
      const quickTake = report.quickTake || {};
      const answer = [quickTake.issue, report.summaryOfIssue]
        .filter((part) => typeof part === "string" && part.trim())
        .join("\n\n");

      const blocks = [];
      if (quickTake.issue || quickTake.whatWeKnow || quickTake.nextStep) {
        blocks.push(
          summaryBlock({
            title: "Quick take",
            text: [
              quickTake.issue ? `Issue: ${quickTake.issue}` : "",
              quickTake.whatWeKnow ? `What we know: ${quickTake.whatWeKnow}` : "",
              quickTake.nextStep ? `Next step: ${quickTake.nextStep}` : ""
            ]
              .filter(Boolean)
              .join("\n")
          })
        );
      }
      if (report.summaryOfIssue) {
        blocks.push(textBlock(report.summaryOfIssue));
      }
      if (Array.isArray(report.whatWeFound) && report.whatWeFound.length > 0) {
        blocks.push(
          textBlock(`What we found:\n${report.whatWeFound.map((f) => `- ${f}`).join("\n")}`)
        );
      }
      if (Array.isArray(report.whatIsMissing) && report.whatIsMissing.length > 0) {
        blocks.push(
          textBlock(`What is missing:\n${report.whatIsMissing.map((f) => `- ${f}`).join("\n")}`)
        );
      }
      if (Array.isArray(report.actionItems) && report.actionItems.length > 0) {
        blocks.push(
          actionsBlock(
            report.actionItems.map((item) => ({
              title: item.task,
              owner: item.owner,
              status: item.status
            }))
          )
        );
      }

      const sources = buildSources(outcome);

      return {
        providerName: "research",
        answer: answer || "Research completed — see the report details.",
        blocks,
        sources,
        toolTrace,
        debug: {
          gstudioSessionId: outcome?.gstudioSessionId || "",
          chatUrl: outcome?.chatUrl || ""
        }
      };
    }
  };
}

function buildSources(outcome) {
  const sources = [];
  for (const finding of outcome?.codeFindings || []) {
    sources.push({
      type: "code",
      title: finding.label || finding.location || "Code finding",
      path: finding.location || finding.webUrl || "",
      snippet: typeof finding.snippets === "string" ? finding.snippets.slice(0, 500) : ""
    });
  }
  for (const finding of outcome?.kbFindings || []) {
    sources.push({
      type: "kb",
      title: finding.label || "KB finding",
      path: finding.webUrl || finding.location || "",
      snippet: typeof finding.snippets === "string" ? finding.snippets.slice(0, 500) : ""
    });
  }
  return sources;
}
