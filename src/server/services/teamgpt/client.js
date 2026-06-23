const DEFAULT_MODEL = "anthropic.claude-sonnet-4-5-20250929-v1:0";
const DEFAULT_WORD_LIMIT = 1200;
const DEFAULT_TONE = "Professional + Straightforward";
const DEFAULT_FORMAT = "plain_text";
const DEFAULT_TEMPERATURE = 0.2;

export function createTeamGptClient(config, teamGptAuthService) {
  if (!teamGptAuthService) {
    return null;
  }

  return {
    describe() {
      return {
        endpointUrl: resolveEndpointUrl(config),
        environment: resolveEnvironment(config),
        appId: resolveAppId(config),
        model: resolveModel(config),
        provider: "teamgpt"
      };
    },

    async completeText(options = {}) {
      const prompt = normalizeText(options.prompt);
      if (!prompt) {
        const error = new Error("Prompt is required.");
        error.statusCode = 400;
        throw error;
      }

      const instructions = normalizeText(options.instructions);
      const authPayload = await teamGptAuthService.getJwtToken();
      const endpointUrl = resolveEndpointUrl(config, options.endpointUrl);
      const body = buildRequestBody(config, {
        ...options,
        instructions,
        prompt
      });

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), resolveTimeoutMs(config));

      let response;
      try {
        response = await fetch(endpointUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authPayload.jwtToken}`,
            appid: resolveAppId(config, options.appId),
            environment: resolveEnvironment(config, options.environment),
            ThreadID: normalizeText(options.threadId),
            "Content-Type": "application/json"
          },
          body: JSON.stringify(body),
          signal: controller.signal
        });
      } catch (error) {
        const timeoutError =
          error?.name === "AbortError"
            ? new Error("TeamGPT request timed out.")
            : error;
        timeoutError.statusCode = 502;
        throw timeoutError;
      } finally {
        clearTimeout(timeout);
      }

      const rawText = await response.text();
      const parsed = parseTeamGptResponse(rawText);

      if (!response.ok) {
        const error = new Error(
          parsed.text ||
            `TeamGPT request failed with ${response.status} ${response.statusText}.`
        );
        error.statusCode = response.status || 502;
        error.rawText = rawText;
        throw error;
      }

      return {
        provider: "teamgpt",
        model: body.model,
        endpointUrl,
        text: parsed.text || rawText.trim(),
        rawText,
        parsedBody: parsed.body,
        threadId:
          parsed.threadId ||
          response.headers.get("ThreadID") ||
          response.headers.get("threadid") ||
          normalizeText(options.threadId),
        pageUrl: authPayload.pageUrl
      };
    }
  };
}

function buildRequestBody(config, options) {
  return {
    wordlimit: resolveWordLimit(options.wordLimit),
    format: normalizeText(options.format) || DEFAULT_FORMAT,
    tone: normalizeText(options.tone) || DEFAULT_TONE,
    temperature: resolveTemperature(options.temperature),
    model: resolveModel(config, options.model),
    messages: [
      {
        role: "user",
        content: [
          {
            text: buildPromptText(options.instructions, options.prompt)
          }
        ]
      }
    ],
    additionalModelRequestFields: buildAdditionalModelRequestFields(config, options)
  };
}

function buildAdditionalModelRequestFields(config, options) {
  const optionFields =
    options.additionalModelRequestFields &&
    typeof options.additionalModelRequestFields === "object"
      ? options.additionalModelRequestFields
      : {};

  return {
    ...buildDefaultModelRequestFields(config),
    ...optionFields
  };
}

function buildDefaultModelRequestFields(config) {
  return {
    large_context_model: normalizeOnOffOption(config?.teamGptLargeContextModel, "on"),
    extended_thinking: normalizeOnOffOption(config?.teamGptExtendedThinking, "on")
  };
}

function buildPromptText(instructions, prompt) {
  const parts = [];

  if (instructions) {
    parts.push(`Instructions:\n${instructions}`);
  }

  parts.push(`User input:\n${prompt}`);

  return parts.join("\n\n");
}

function parseTeamGptResponse(rawText) {
  const trimmed = typeof rawText === "string" ? rawText.trim() : "";
  if (!trimmed) {
    return {
      text: "",
      body: null,
      threadId: ""
    };
  }

  const jsonBody = tryParseJson(trimmed);
  if (jsonBody) {
    return {
      text: normalizeJoinedText(extractTextSegments(jsonBody)),
      body: jsonBody,
      threadId: extractThreadId(jsonBody)
    };
  }

  const streamed = parseEventStream(trimmed);
  if (streamed.text || streamed.body.length > 0) {
    return {
      text: streamed.text,
      body: streamed.body,
      threadId: streamed.threadId
    };
  }

  return {
    text: trimmed,
    body: null,
    threadId: ""
  };
}

function parseEventStream(rawText) {
  const body = [];
  const segments = [];
  let threadId = "";

  for (const line of rawText.split(/\r?\n/)) {
    const trimmedLine = line.trim();
    if (!trimmedLine.startsWith("data:")) {
      continue;
    }

    const data = trimmedLine.slice(5).trim();
    if (!data || data === "[DONE]") {
      continue;
    }

    const jsonBody = tryParseJson(data);
    if (jsonBody) {
      body.push(jsonBody);
      appendTextSegments(segments, extractTextSegments(jsonBody));
      threadId = threadId || extractThreadId(jsonBody);
      continue;
    }

    appendTextSegments(segments, [data]);
  }

  return {
    text: normalizeJoinedText(segments),
    body,
    threadId
  };
}

function extractTextSegments(payload) {
  const directSegments = [];

  appendTextSegments(directSegments, [
    joinContentText(payload?.output?.message?.content),
    joinContentText(payload?.message?.content),
    joinContentText(payload?.output?.content),
    joinContentText(payload?.content),
    normalizeText(payload?.outputText),
    normalizeText(payload?.output_text),
    normalizeText(payload?.completion),
    normalizeText(payload?.answer),
    normalizeText(payload?.delta?.text)
  ]);

  if (directSegments.length > 0) {
    return directSegments;
  }

  const recursiveSegments = [];
  collectRecursiveText(payload, recursiveSegments);
  return recursiveSegments;
}

function collectRecursiveText(value, segments) {
  if (!value) {
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectRecursiveText(item, segments);
    }
    return;
  }

  if (typeof value !== "object") {
    return;
  }

  for (const [key, entryValue] of Object.entries(value)) {
    if (typeof entryValue === "string") {
      if (
        key === "text" ||
        key === "outputText" ||
        key === "output_text" ||
        key === "completion" ||
        key === "answer"
      ) {
        appendTextSegments(segments, [entryValue]);
      }
      continue;
    }

    collectRecursiveText(entryValue, segments);
  }
}

function joinContentText(content) {
  if (!Array.isArray(content)) {
    return "";
  }

  const segments = [];

  for (const part of content) {
    if (typeof part === "string") {
      appendTextSegments(segments, [part]);
      continue;
    }

    if (part && typeof part === "object") {
      if (typeof part.text === "string") {
        appendTextSegments(segments, [part.text]);
      } else if (typeof part.outputText === "string") {
        appendTextSegments(segments, [part.outputText]);
      }
    }
  }

  return normalizeJoinedText(segments);
}

function appendTextSegments(target, values) {
  for (const value of values) {
    const trimmed = normalizeText(value);
    if (!trimmed) {
      continue;
    }

    const lastValue = target[target.length - 1];
    if (lastValue === trimmed) {
      continue;
    }

    target.push(trimmed);
  }
}

function normalizeJoinedText(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return "";
  }

  const normalized = [];
  for (const value of values) {
    const trimmed = normalizeText(value);
    if (!trimmed) {
      continue;
    }

    const previous = normalized[normalized.length - 1];
    if (previous === trimmed) {
      continue;
    }

    normalized.push(trimmed);
  }

  return normalized.join("\n").trim();
}

function extractThreadId(payload) {
  const directCandidates = [
    payload?.ThreadID,
    payload?.threadId,
    payload?.threadID,
    payload?.output?.ThreadID,
    payload?.output?.threadId,
    payload?.message?.ThreadID,
    payload?.message?.threadId
  ];

  for (const candidate of directCandidates) {
    const normalized = normalizeText(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return "";
}

function tryParseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function resolveEndpointUrl(config, overrideValue) {
  return (
    normalizeText(overrideValue) ||
    normalizeText(config?.teamGptEndpointUrl) ||
    "https://genai-proxy-na.benchmarkdigital.com/bedrock/converse/chat/teamgpt-ask-anything-bedrock?stream=true"
  );
}

function resolveAppId(config, overrideValue) {
  return normalizeText(overrideValue) || normalizeText(config?.teamGptAppId) || "9225";
}

function resolveEnvironment(config, overrideValue) {
  return (
    normalizeText(overrideValue) || normalizeText(config?.teamGptEnvironment) || "prod"
  );
}

function resolveModel(config, overrideValue) {
  return normalizeText(overrideValue) || normalizeText(config?.teamGptModel) || DEFAULT_MODEL;
}

function resolveWordLimit(value) {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }

  return DEFAULT_WORD_LIMIT;
}

function resolveTemperature(value) {
  const parsed = Number(value);
  if (Number.isFinite(parsed)) {
    return parsed;
  }

  return DEFAULT_TEMPERATURE;
}

function resolveTimeoutMs(config) {
  const parsed = Number(config?.requestTimeoutMs);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }

  return 20000;
}

function normalizeText(value) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function normalizeOnOffOption(value, fallback) {
  const normalized = normalizeText(value).toLowerCase();
  return normalized === "on" || normalized === "off" ? normalized : fallback;
}
