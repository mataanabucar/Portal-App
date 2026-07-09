// aris_search (Genny Studio) research collector. Unlike collectKbResearch,
// this does not return raw evidence to be summarized — aris_search already
// returns a final, user-facing answer, so the caller (researchPipeline)
// should use `text` directly as the report body and skip OpenAI/TeamGPT
// synthesis when this succeeds.

export async function collectArisSearchResearch({
  gennyStudioService,
  itemContext,
  userQuery,
  sessionId = "",
  authToken = "",
}) {
  const trail = [];

  if (!gennyStudioService) {
    trail.push({
      tool: "gstudio_search",
      summary: "Genny Studio service is unavailable in this server build.",
    });
    return { trail, text: "", sessionId: "", evidenceBlock: null };
  }

  const status = gennyStudioService.describe();
  if (!status.enabled) {
    trail.push({
      tool: "gstudio_search",
      summary: "Genny Studio search skipped: not configured (missing base URL or TeamGPT auth service).",
    });
    return { trail, text: "", sessionId: "", evidenceBlock: null };
  }

  const prompt = buildPrompt(itemContext, userQuery);
  const options = normalizeText(authToken) ? { authToken } : {};

  try {
    const result = await gennyStudioService.invoke(
      { prompt, sessionId },
      options
    );

    const text = normalizeText(result.text);
    trail.push({
      tool: "gstudio_search",
      summary: text
        ? `Genny Studio (${result.agentRef}) returned a ${text.length}-char answer.`
        : `Genny Studio (${result.agentRef}) returned an empty/unparseable response.`,
    });

    if (!text) {
      return { trail, text: "", sessionId: result.sessionId || "", evidenceBlock: null };
    }

    return {
      trail,
      text,
      sessionId: result.sessionId || "",
      evidenceBlock: {
        source: "gstudio",
        label: `Genny Studio Search (${result.agentRef})`,
        location: result.agentRef,
        webUrl: null,
        language: "Genny Studio",
        snippets: text,
      },
    };
  } catch (error) {
    trail.push({
      tool: "gstudio_search",
      summary: `Genny Studio search failed: ${error.message || error}`,
    });
    return { trail, text: "", sessionId: "", evidenceBlock: null };
  }
}

function buildPrompt(itemContext, userQuery) {
  const parts = [];
  if (normalizeText(itemContext)) {
    parts.push(`Portal item context:\n${itemContext.trim()}`);
  }
  parts.push(`Question:\n${normalizeText(userQuery)}`);
  return parts.join("\n\n");
}

function normalizeText(value) {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}
