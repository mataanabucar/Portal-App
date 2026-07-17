// Deterministic Microsoft Graph provider — READ-ONLY by design. A small
// keyword-derived intent set maps to allowlisted catalog functions through
// the shared runGraphFunction runner (same validation + audit logging as the
// legacy assistant). Mutation-flavored requests get guidance text and never
// propose or execute anything, so the confirmation gate is preserved
// trivially. Graph results are untrusted content: rendered as data cells
// only, never treated as instructions.

import { getTokenScopes } from "../../graph/tokenUtils.js";
import { buildFriendlyCapabilities } from "../../graph/assistantCapabilities.js";
import { runGraphFunction } from "../../assistant/graphFunctionRunner.js";
import { textBlock, tableBlock } from "../responseBlocks.js";

const MUTATION_GUIDANCE =
  "Actions that change Microsoft 365 data (send, reply, delete, schedule, post) are not executed automatically. Use the TEXT assistant action flow when a supported mutation is available; every change requires explicit confirmation before execution.";

const SIGN_IN_GUIDANCE =
  "Sign in with your Microsoft account first (npm run graph-tester) to ask about your mail, calendar, or Teams chats.";

export function createGraphProvider({ graphAuth, pendingActionStore }) {
  return {
    providerName: "graph",

    async run({ routerResult }) {
      const toolTrace = [];
      const intent = routerResult?.graphIntent || { kind: "capabilities_help" };

      if (intent.kind === "mutation_guidance") {
        toolTrace.push({
          tool: "graph_intent",
          args: { kind: intent.kind },
          resultSummary: "Mutation-style request — returned guidance, proposed nothing."
        });
        return finish(MUTATION_GUIDANCE, [textBlock(MUTATION_GUIDANCE)], [], toolTrace);
      }

      if (!graphAuth) {
        const answer =
          "Microsoft Graph is not configured on this server (GRAPH_* settings missing), so mail/calendar/Teams questions are unavailable.";
        toolTrace.push({ tool: "graph_intent", resultSummary: "Graph auth not configured." });
        return finish(answer, [textBlock(answer)], [], toolTrace);
      }

      let token;
      try {
        token = await graphAuth.getAccessToken();
      } catch (error) {
        toolTrace.push({
          tool: "graph_intent",
          resultSummary: `No Graph token: ${error?.message || "sign-in required."}`
        });
        return finish(SIGN_IN_GUIDANCE, [textBlock(SIGN_IN_GUIDANCE)], [], toolTrace);
      }

      const grantedScopes = getTokenScopes(token);

      if (intent.kind === "capabilities_help") {
        const capabilities = buildFriendlyCapabilities(grantedScopes)
          .filter((cap) => cap.enabled)
          .map((cap) => cap.capability);
        const answer = capabilities.length
          ? `I can look up your Microsoft 365 data: ${capabilities.join(", ")}. Ask about recent emails, unread mail, your calendar, Teams chats, or your profile.`
          : "The signed-in account has no enabled Microsoft 365 capabilities for this assistant.";
        toolTrace.push({
          tool: "graph_capabilities",
          resultSummary: `${capabilities.length} enabled capabilit(ies).`
        });
        return finish(answer, [textBlock(answer)], [], toolTrace);
      }

      const call = buildCatalogCall(intent);
      if (!call) {
        return finish(SIGN_IN_GUIDANCE, [textBlock(SIGN_IN_GUIDANCE)], [], toolTrace);
      }

      const outcome = await runGraphFunction(
        { service: call.service, functionName: call.functionName, args: call.args },
        { token, grantedScopes, pendingActionStore }
      );

      toolTrace.push({
        tool: "run_graph_function",
        args: { service: call.service, functionName: call.functionName },
        resultSummary: outcome.error ? `error: ${outcome.error}` : "ok"
      });

      if (outcome.error) {
        const answer = `Microsoft 365 lookup failed: ${outcome.error}`;
        return finish(answer, [textBlock(answer)], [], toolTrace);
      }

      const rendered = renderGraphResult(intent, outcome.result);
      const sources = [
        {
          type: "graph",
          title: `${call.service}.${call.functionName}`,
          path: `graph:${call.service}.${call.functionName}`,
          snippet: ""
        }
      ];
      return finish(rendered.answer, rendered.blocks, sources, toolTrace);
    }
  };
}

function finish(answer, blocks, sources, toolTrace) {
  return { providerName: "graph", answer, blocks, sources, toolTrace };
}

function buildCatalogCall(intent) {
  switch (intent.kind) {
    case "recent_emails":
      return {
        service: "mail",
        functionName: "listInboxMessages",
        args: { top: intent.limit || 10 }
      };
    case "unread_emails":
      return {
        service: "mail",
        functionName: "listUnreadMessages",
        args: { top: intent.limit || 10 }
      };
    case "search_emails":
      return {
        service: "mail",
        functionName: "searchMyMessages",
        args: { text: intent.query || "", top: intent.limit || 10 }
      };
    case "calendar_view": {
      const { start, end } = calendarWindowToRange(intent.window);
      return {
        service: "calendar",
        functionName: "getMyCalendarView",
        args: { start, end }
      };
    }
    case "search_chats":
      return {
        service: "teamsChat",
        functionName: "searchMyChats",
        args: { text: intent.query || "", top: 10 }
      };
    case "profile":
      return { service: "user", functionName: "getMe", args: {} };
    default:
      return null;
  }
}

function calendarWindowToRange(window) {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayMs = 24 * 60 * 60 * 1000;
  switch (window) {
    case "today":
      return {
        start: startOfDay.toISOString(),
        end: new Date(startOfDay.getTime() + dayMs).toISOString()
      };
    case "tomorrow":
      return {
        start: new Date(startOfDay.getTime() + dayMs).toISOString(),
        end: new Date(startOfDay.getTime() + 2 * dayMs).toISOString()
      };
    case "week":
      return {
        start: startOfDay.toISOString(),
        end: new Date(startOfDay.getTime() + 7 * dayMs).toISOString()
      };
    default:
      // upcoming: now through 14 days out
      return {
        start: now.toISOString(),
        end: new Date(now.getTime() + 14 * dayMs).toISOString()
      };
  }
}

function renderGraphResult(intent, data) {
  const rows = Array.isArray(data?.value) ? data.value : Array.isArray(data) ? data : null;

  switch (intent.kind) {
    case "recent_emails":
    case "unread_emails":
    case "search_emails": {
      const messages = rows || [];
      if (messages.length === 0) {
        const answer =
          intent.kind === "unread_emails" ? "No unread emails found." : "No matching emails found.";
        return { answer, blocks: [textBlock(answer)] };
      }
      const answer = `Found ${messages.length} email(s).`;
      return {
        answer,
        blocks: [
          textBlock(answer),
          tableBlock({
            title: "Emails",
            columns: ["From", "Subject", "Received", "Read"],
            rows: messages.map((m) => [
              m?.from?.emailAddress?.name || m?.from?.emailAddress?.address || "",
              m?.subject || "",
              m?.receivedDateTime || "",
              m?.isRead === false ? "unread" : "read"
            ])
          })
        ]
      };
    }
    case "calendar_view": {
      const events = rows || [];
      if (events.length === 0) {
        const answer = "No events in that window.";
        return { answer, blocks: [textBlock(answer)] };
      }
      const answer = `Found ${events.length} event(s).`;
      return {
        answer,
        blocks: [
          textBlock(answer),
          tableBlock({
            title: "Calendar",
            columns: ["Start", "Subject", "Location"],
            rows: events.map((e) => [
              e?.start?.dateTime || "",
              e?.subject || "",
              e?.location?.displayName || ""
            ])
          })
        ]
      };
    }
    case "search_chats": {
      const chats = rows || [];
      if (chats.length === 0) {
        const answer = "No matching Teams chats found.";
        return { answer, blocks: [textBlock(answer)] };
      }
      const answer = `Found ${chats.length} chat(s).`;
      return {
        answer,
        blocks: [
          textBlock(answer),
          tableBlock({
            title: "Teams chats",
            columns: ["Topic", "Type", "Last updated"],
            rows: chats.map((c) => [
              c?.topic || c?.id || "",
              c?.chatType || "",
              c?.lastUpdatedDateTime || ""
            ])
          })
        ]
      };
    }
    case "profile": {
      const me = data && typeof data === "object" ? data : {};
      const answer = `Signed in as ${me.displayName || me.userPrincipalName || "unknown"}${me.mail ? ` (${me.mail})` : ""}.`;
      return {
        answer,
        blocks: [
          textBlock(answer),
          tableBlock({
            title: "Profile",
            columns: ["Field", "Value"],
            rows: [
              ["Name", me.displayName || ""],
              ["Email", me.mail || me.userPrincipalName || ""],
              ["Job title", me.jobTitle || ""],
              ["Office", me.officeLocation || ""]
            ]
          })
        ]
      };
    }
    default: {
      const answer = "Lookup completed.";
      return { answer, blocks: [textBlock(answer)] };
    }
  }
}
