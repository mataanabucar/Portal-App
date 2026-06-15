import "dotenv/config";
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
import { createSourcebotService } from "./services/sourcebot/index.js";

export function startServer(overrides = {}) {
  const config = buildConfig(overrides);
  const portalService = createPortalService(config);
  const graphAuth = createPortalGraphAuth(config);
  const sourcebotService = createSourcebotService(config);
  const app = createApp({
    config,
    portalService,
    summarizer: createSummarizer(config),
    parser: createPortalParser(config),
    asker: createAskService(config),
    graphAuth,
    emailContextSummarizer: createEmailContextSummarizer(config),
    sourcebotService,
  });
  let disposed = false;

  const dispose = async () => {
    if (disposed) {
      return;
    }

    disposed = true;
    await portalService.dispose();
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
