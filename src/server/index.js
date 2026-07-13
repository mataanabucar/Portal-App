import "../loadEnv.js";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";
import { buildConfig } from "./config/env.js";
import {
  createAskService,
  createEmailContextSummarizer,
  createPortalParser,
  createSummarizer,
} from "./services/ai/index.js";
import { createPortalService } from "./services/portal/index.js";
import { createPortalGraphAuth } from "./services/graph/portalGraphAuth.js";
import { createKbService } from "./services/kb/index.js";
import { createGennyStudioService } from "./services/gennystudio/index.js";
import { createSourcebotService } from "./services/sourcebot/index.js";
import { createDocsKbService } from "./services/docsKb/index.js";
import { createCodeKbService } from "./services/codeKb/index.js";
import { createTeamGptAuthService } from "./services/teamgpt/auth.js";
import { createModelProvider } from "./services/ai/modelProvider.js";
import { createInMemoryPendingActionStore } from "./services/assistant/pendingActions.js";
import { createAssistantController } from "./services/assistant/controller.js";
import { createAssistantBambooImageHooks } from "./services/assistant/bambooImageHooks.js";
import { createOrchestrator } from "./services/orchestrator/index.js";
import { createExecutiveDayOrganizer } from "./services/briefing/executiveDayOrganizer.js";
import { createDisabledKbStub } from "./services/disabledStubs.js";

export function startServer(overrides = {}) {
  const config = buildConfig(overrides);
  const portalService = createPortalService(config);
  const graphAuth = createPortalGraphAuth(config);
  const teamGptAuthService = createTeamGptAuthService(config);
  const kbService = createKbService(config, { teamGptAuthService });
  const gennyStudioService = createGennyStudioService(config, { teamGptAuthService });
  const sourcebotService = createSourcebotService(config);
  // Local RAG is archived: embedding-backed docs/code search only builds when
  // explicitly enabled; otherwise disabled stubs keep every call site no-op.
  const embeddingSearchEnabled = config.assistantEmbeddingMode !== "disabled";
  const docsKbService = embeddingSearchEnabled
    ? createDocsKbService(config)
    : createDisabledKbStub("docs");
  const codeKbService = embeddingSearchEnabled
    ? createCodeKbService(config)
    : createDisabledKbStub("code");
  // No Ollama/cloud chat client is constructed in orchestrator mode.
  const assistantModelProvider =
    config.assistantModelMode === "orchestrator" ? null : createModelProvider(config);
  const assistantPendingActionStore = createInMemoryPendingActionStore();
  const assistantBambooImageHooks = createAssistantBambooImageHooks(config);
  // Controller stays constructed in every mode: the action confirm/cancel
  // routes need it, and they only use graphAuth + pendingActionStore.
  const assistantController = createAssistantController(config, {
    graphAuth,
    docsKbService,
    codeKbService,
    pendingActionStore: assistantPendingActionStore,
    modelProvider: assistantModelProvider,
  });
  const orchestrator = createOrchestrator(config, {
    gennyStudioService,
    sourcebotService,
    kbService,
    graphAuth,
    docsKbService,
    teamGptAuthService,
    pendingActionStore: assistantPendingActionStore,
  });
  const executiveDayOrganizer = createExecutiveDayOrganizer(config, {
    teamGptAuthService,
  });
  const app = createApp({
    config,
    portalService,
    summarizer: createSummarizer(config, { teamGptAuthService }),
    parser: createPortalParser(config, { teamGptAuthService }),
    asker: createAskService(config, { teamGptAuthService }),
    graphAuth,
    emailContextSummarizer: createEmailContextSummarizer(config),
    kbService,
    gennyStudioService,
    sourcebotService,
    docsKbService,
    codeKbService,
    teamGptAuthService,
    assistantModelProvider,
    assistantPendingActionStore,
    assistantBambooImageHooks,
    assistantController,
    orchestrator,
    executiveDayOrganizer,
  });
  let disposed = false;

  const dispose = async () => {
    if (disposed) {
      return;
    }

    disposed = true;
    await portalService.dispose();
    await teamGptAuthService.dispose();
  };

  const server = app.listen(config.port, config.host, () => {
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : config.port;
    console.log(`Portal Visualizer listening on http://${config.host}:${port}`);
  });

  server.on("close", () => {
    void dispose();
  });

  const ready = server.listening
    ? Promise.resolve()
    : new Promise((resolve) => {
        server.once("listening", resolve);
      });

  return { app, config, server, ready, dispose };
}

const currentFile = fileURLToPath(import.meta.url);

if (process.argv[1] === currentFile) {
  startServer();
}
