// TeamGPT provider — summaries and action-item/follow-up extraction only.
// General KB questions never route here (spec: never route general KB to
// TeamGPT by default).

import { ROUTES } from "../intentRouter.js";
import { textBlock, summaryBlock, actionsBlock } from "../responseBlocks.js";

export function createTeamGptProvider({ teamGptTasks }) {
  return {
    providerName: "teamgpt",

    async run({ prompt, history = [], routerResult }) {
      const toolTrace = [];
      const route = routerResult?.route;
      const body = routerResult?.providedText?.body || prompt;

      try {
        if (route === ROUTES.SUMMARY_CONVERSATION) {
          const result = await teamGptTasks.summarizeConversation({ messages: history });
          toolTrace.push({
            tool: "teamgpt_summarize_conversation",
            resultSummary: `Summary of ${history.length} message(s).`
          });
          return {
            providerName: "teamgpt",
            answer: result.text,
            blocks: [summaryBlock({ title: "Conversation summary", text: result.text })],
            sources: teamGptSource(result.model),
            toolTrace,
            model: result.model
          };
        }

        if (route === ROUTES.SUMMARY_TEXT) {
          const result = await teamGptTasks.summarizeText({ text: body });
          toolTrace.push({
            tool: "teamgpt_summarize_text",
            resultSummary: `Summarized ${body.length} chars.`
          });
          return {
            providerName: "teamgpt",
            answer: result.text,
            blocks: [summaryBlock({ title: "Summary", text: result.text })],
            sources: teamGptSource(result.model),
            toolTrace,
            model: result.model
          };
        }

        // action_items — pick the follow-up flavor when the trigger keyword was
        // follow-up-ish.
        const followUpFlavored = (routerResult?.matchedKeywords || []).some((k) =>
          /follow/.test(k)
        );
        const result = followUpFlavored
          ? await teamGptTasks.parseFollowUps({ text: body })
          : await teamGptTasks.extractActionItems({ text: body });

        if (!result.items) {
          toolTrace.push({
            tool: "teamgpt_action_items",
            resultSummary: `warning: ${result.warning || "unparseable JSON"}`
          });
          const answer =
            "Action items could not be parsed as structured data. Raw extraction below.";
          return {
            providerName: "teamgpt",
            answer,
            blocks: [textBlock(answer), textBlock(result.rawText || "")],
            sources: teamGptSource(result.model),
            toolTrace,
            model: result.model
          };
        }

        toolTrace.push({
          tool: "teamgpt_action_items",
          resultSummary: `Extracted ${result.items.length} item(s).`
        });
        const answer =
          result.items.length > 0
            ? `Extracted ${result.items.length} action item(s).`
            : "No action items found in the provided text.";
        return {
          providerName: "teamgpt",
          answer,
          blocks: [textBlock(answer), actionsBlock(result.items)],
          sources: teamGptSource(result.model),
          toolTrace,
          model: result.model
        };
      } catch (error) {
        const answer = `TeamGPT request failed: ${error?.message || "unknown error"}. Check TeamGPT auth (GET /api/teamgpt/auth).`;
        toolTrace.push({ tool: "teamgpt_task", resultSummary: `error: ${answer}` });
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

function teamGptSource(model) {
  return [
    {
      type: "teamgpt",
      title: "TeamGPT",
      path: `teamgpt:${model || "default"}`,
      snippet: ""
    }
  ];
}
