/**
 * Microsoft Graph API integration test script.
 *
 * Usage:
 *   node scripts/test-graph-api.js [test]
 *
 * Tests:
 *   all (default) | me | photo | users | search-users |
 *   messages | inbox | unread | message-search |
 *   mailbox | calendar | calendar-view | calendar-today |
 *   chats | chat-messages | people | token
 *
 * Set before running:
 *   GRAPH_TENANT_ID, GRAPH_CLIENT_ID, GRAPH_REDIRECT_URI
 *   GRAPH_CLIENT_SECRET (prefer a Windows user environment variable)
 */

import "dotenv/config";
import { buildConfig } from "../src/server/config/env.js";
import { acquireTokenInteractive } from "../src/server/services/graph/graphClient.js";
import { isTokenExpired, getTokenScopes } from "../src/server/services/graph/tokenUtils.js";
import * as userService            from "../src/server/services/graph/services/userService.js";
import * as calendarService        from "../src/server/services/graph/services/calendarService.js";
import * as mailService            from "../src/server/services/graph/services/mailService.js";
import * as mailboxSettingsService from "../src/server/services/graph/services/mailboxSettingsService.js";
import * as teamsChatService       from "../src/server/services/graph/services/teamsChatService.js";
import * as peopleService          from "../src/server/services/graph/services/peopleService.js";
import { GraphError } from "../src/server/services/graph/graphErrors.js";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const config = buildConfig();

const authCfg = {
  tenantId:     config.graphTenantId,
  clientId:     config.graphClientId,
  clientSecret: config.graphClientSecret,
  redirectUri:  config.graphRedirectUri,
  scopes:       config.graphScopes,
};

if (!authCfg.tenantId || !authCfg.clientId || !authCfg.clientSecret) {
  console.error(
    "\nERROR: Missing Graph credentials. Set these values before running:\n" +
    "  GRAPH_TENANT_ID\n" +
    "  GRAPH_CLIENT_ID\n" +
    "  GRAPH_CLIENT_SECRET (prefer a Windows user environment variable)\n"
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Test definitions
// ---------------------------------------------------------------------------

const TESTS = {
  // ── Token ─────────────────────────────────────────────────────────────────
  async token(token) {
    section("Token info");
    const scopes = getTokenScopes(token);
    console.log("Granted scopes:", scopes.join(", ") || "(none — may be app token)");
    console.log("Expired?", isTokenExpired(token) ? "YES" : "no");
  },

  // ── User ──────────────────────────────────────────────────────────────────
  async me(token) {
    section("/me");
    const me = await userService.getMe(token, {
      select: "id,displayName,mail,userPrincipalName,jobTitle,officeLocation,mobilePhone",
    });
    console.log("Name:     ", me.displayName);
    console.log("Email:    ", me.mail ?? me.userPrincipalName);
    console.log("Title:    ", me.jobTitle);
    console.log("Office:   ", me.officeLocation);
    console.log("ID:       ", me.id);
  },

  async photo(token) {
    section("/me/photo metadata");
    const meta = await userService.getMyPhotoMetadata(token);
    console.log("Photo size:", `${meta.width}x${meta.height}`);
    console.log("@odata.mediaContentType:", meta["@odata.mediaContentType"]);
    // getMyPhotoValue(token) returns a Response — pipe it to a file to save
  },

  async users(token) {
    section("/users (top 5)");
    const list = await userService.listUsers(token, {
      top: 5,
      select: "id,displayName,mail,userPrincipalName,jobTitle",
    });
    list.forEach((u, i) => console.log(`  [${i+1}] ${u.displayName} — ${u.mail ?? u.userPrincipalName}`));
  },

  async "search-users"(token) {
    section("/users $search");
    const results = await userService.searchUsers(token, "Mataan", { top: 5 });
    results.forEach((u, i) => console.log(`  [${i+1}] ${u.displayName} <${u.mail}>`));
  },

  // ── Mail ──────────────────────────────────────────────────────────────────
  async messages(token) {
    section("/me/messages (top 5, basic)");
    const msgs = await mailService.listMyMessagesBasic(token, { top: 5 });
    msgs.forEach((m, i) => {
      const from = m.from?.emailAddress?.address ?? "—";
      const read = m.isRead ? "  " : "* ";
      console.log(`${read}[${i+1}] ${m.subject}`);
      console.log(`      ${from}  |  ${m.receivedDateTime}`);
    });
  },

  async inbox(token) {
    section("/me/mailFolders/inbox/messages (top 5)");
    const msgs = await mailService.listInboxMessages(token, {
      top: 5,
      select: "id,subject,from,receivedDateTime,isRead",
    });
    msgs.forEach((m, i) => console.log(`  [${i+1}] ${m.subject} — ${m.from?.emailAddress?.address}`));
  },

  async unread(token) {
    section("/me/messages?$filter=isRead eq false (top 5)");
    const msgs = await mailService.listUnreadMessages(token, { top: 5 });
    if (!msgs.length) { console.log("  (no unread messages)"); return; }
    msgs.forEach((m, i) => console.log(`  [${i+1}] ${m.subject}`));
  },

  async "message-search"(token) {
    section('/me/messages?$search="expense"');
    const msgs = await mailService.searchMyMessages(token, "expense", { top: 5 });
    if (!msgs.length) { console.log("  (no matches)"); return; }
    msgs.forEach((m, i) => console.log(`  [${i+1}] ${m.subject}`));
  },

  // ── Mailbox settings ──────────────────────────────────────────────────────
  async mailbox(token) {
    section("/me/mailboxSettings");
    const s = await mailboxSettingsService.getMyMailboxSettings(token);
    console.log("Timezone:     ", s.timeZone);
    console.log("Language:     ", s.language?.displayName);
    console.log("Auto-reply:   ", s.automaticRepliesSetting?.status);
    console.log("Working days: ", s.workingHours?.daysOfWeek?.join(", ") ?? "—");
  },

  // ── Calendar ──────────────────────────────────────────────────────────────
  async calendar(token) {
    section("/me/calendars");
    const cals = await calendarService.listMyCalendars(token, {
      select: "id,name,canEdit,owner",
    });
    cals.forEach((c, i) => console.log(`  [${i+1}] ${c.name} (canEdit: ${c.canEdit})`));
  },

  async "calendar-view"(token) {
    section("/me/calendar/calendarView — next 7 days");
    const start = new Date().toISOString();
    const end   = new Date(Date.now() + 7 * 86400000).toISOString();
    const events = await calendarService.getMyCalendarView(token, start, end, {
      select: "id,subject,start,end,location,organizer",
      top: 10,
    });
    if (!events.length) { console.log("  (no events)"); return; }
    events.forEach((e, i) => {
      console.log(`  [${i+1}] ${e.subject}`);
      console.log(`      Start: ${e.start?.dateTime} (${e.start?.timeZone})`);
    });
  },

  async "calendar-today"(token) {
    section("/me/calendar/calendarView — today only");
    const now   = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const end   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
    const events = await calendarService.getMyCalendarView(token, start, end, { top: 10 });
    if (!events.length) { console.log("  (no events today)"); return; }
    events.forEach((e, i) => console.log(`  [${i+1}] ${e.subject} — ${e.start?.dateTime}`));
  },

  // ── Teams chats ───────────────────────────────────────────────────────────
  async chats(token) {
    section("/me/chats (top 5)");
    const chats = await teamsChatService.listMyChats(token, { top: 5 });
    if (!chats.length) { console.log("  (no chats)"); return; }
    chats.forEach((c, i) => console.log(`  [${i+1}] ${c.topic ?? "(unnamed)"}  [${c.chatType}]  id: ${c.id}`));
  },

  async "chat-messages"(token) {
    section("/chats/{chatId}/messages — first chat, last 5 messages");
    const chats = await teamsChatService.listMyChats(token, { top: 1 });
    if (!chats.length) { console.log("  (no chats available)"); return; }

    const chatId = chats[0].id;
    console.log("Chat:", chats[0].topic ?? chatId);
    const msgs = await teamsChatService.listChatMessages(token, chatId, { top: 5 });
    if (!msgs.length) { console.log("  (no messages)"); return; }
    msgs.forEach((m, i) => {
      const from = m.from?.user?.displayName ?? "unknown";
      const body = m.body?.content?.replace(/<[^>]+>/g, "").slice(0, 80) ?? "";
      console.log(`  [${i+1}] ${from}: ${body}`);
    });
  },

  // ── People ────────────────────────────────────────────────────────────────
  async people(token) {
    section("/me/people (top 5)");
    const people = await peopleService.listRelevantPeople(token, {
      top: 5,
      select: "displayName,scoredEmailAddresses,jobTitle,personType",
    });
    people.forEach((p, i) => {
      const email = p.scoredEmailAddresses?.[0]?.address ?? "—";
      console.log(`  [${i+1}] ${p.displayName} <${email}> — ${p.jobTitle ?? "—"}`);
    });
  },
};

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------
async function run() {
  const testArg = process.argv[2] ?? "all";

  console.log("[graph-test] Acquiring token via browser login...\n");
  let tokenSet;
  try {
    tokenSet = await acquireTokenInteractive(authCfg);
  } catch (err) {
    console.error("Failed to acquire token:", err.message);
    process.exit(1);
  }

  const { accessToken } = tokenSet;
  console.log("\n[graph-test] Token acquired. Running tests...");

  const toRun = testArg === "all" ? Object.keys(TESTS) : [testArg];
  let passed = 0, failed = 0;

  for (const name of toRun) {
    const fn = TESTS[name];
    if (!fn) { console.warn(`\nUnknown test "${name}" — skip`); continue; }

    try {
      await fn(accessToken, tokenSet);
      passed++;
    } catch (err) {
      console.error(`\n  [FAIL] ${name}: ${err.message}`);
      if (err instanceof GraphError) {
        console.error(`  Status: ${err.status} ${err.graphCode ?? ""}`);
        if (err.graphMessage) console.error(`  Graph: ${err.graphMessage}`);
      }
      failed++;
    }
  }

  console.log(`\n[graph-test] Done. ${passed} passed, ${failed} failed.`);
}

function section(title) {
  console.log(`\n${"─".repeat(55)}`);
  console.log(`  ${title}`);
  console.log("─".repeat(55));
}

run();
