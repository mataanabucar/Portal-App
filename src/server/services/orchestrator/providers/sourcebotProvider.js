// Sourcebot code-search provider. Deterministic searchCode only — askCodebase
// (Sourcebot's own LLM chat) stays reserved for the research pipeline, so
// this route has bounded latency and predictable output.

import { textBlock, tableBlock } from "../responseBlocks.js";

const MAX_SNIPPET_FILES = 3;
const MAX_SNIPPET_CHARS = 1200;

export function createSourcebotProvider({ sourcebotService }) {
  return {
    providerName: "sourcebot",

    async run({ prompt, routerResult }) {
      const toolTrace = [];
      const query = (routerResult?.residualPrompt || prompt || "").slice(0, 120);

      let outcome;
      try {
        outcome = await sourcebotService.searchCode({
          query,
          includeCodeSnippets: true
        });
      } catch (error) {
        const answer = `Code search failed: ${error?.message || "Sourcebot request failed."}`;
        toolTrace.push({ tool: "sourcebot_search", resultSummary: `error: ${answer}` });
        return {
          providerName: "sourcebot",
          answer,
          blocks: [textBlock(answer)],
          sources: [],
          toolTrace
        };
      }

      const files = Array.isArray(outcome?.files) ? outcome.files : [];
      toolTrace.push({
        tool: "sourcebot_search",
        args: { query },
        resultSummary: `Found ${files.length} file(s) (totalFiles: ${outcome?.totalFiles ?? files.length}).`
      });

      if (files.length === 0) {
        const answer = `No code matches for "${query}". Try a narrower term (a function name, route path, or file name), or run item research (/api/item/research) for a deeper investigation.`;
        return {
          providerName: "sourcebot",
          answer,
          blocks: [textBlock(answer)],
          sources: [],
          toolTrace
        };
      }

      const answer = `Found ${outcome?.totalFiles ?? files.length} matching file(s) for "${query}". Top matches below.`;
      const blocks = [
        textBlock(answer),
        tableBlock({
          title: "Matching files",
          columns: ["Repository", "File", "Language"],
          rows: files.map((file) => [
            file.repository || "",
            file.fileName || "",
            file.language || ""
          ])
        })
      ];

      for (const file of files.slice(0, MAX_SNIPPET_FILES)) {
        const snippet = (Array.isArray(file.chunks) ? file.chunks : [])
          .join("\n---\n")
          .slice(0, MAX_SNIPPET_CHARS);
        if (snippet) {
          blocks.push(textBlock(`${file.repository || ""}/${file.fileName || ""}:\n${snippet}`));
        }
      }

      const sources = files.map((file) => ({
        type: "code",
        title: file.fileName || "",
        path: `${file.repository || ""}/${file.fileName || ""}`,
        snippet: (Array.isArray(file.chunks) ? file.chunks[0] || "" : "").slice(0, 500)
      }));

      return { providerName: "sourcebot", answer, blocks, sources, toolTrace };
    }
  };
}
