import "dotenv/config";
import { fileURLToPath } from "node:url";
import { createGraphTesterApp } from "./app.js";
import { buildGraphTesterConfig } from "./config.js";
import { createGraphTesterAuthStore } from "./utils/graphSession.js";

export function startGraphTesterServer(overrides = {}) {
  const config = buildGraphTesterConfig(overrides);
  const authStore = createGraphTesterAuthStore(config);
  const app = createGraphTesterApp({ config, authStore });
  const server = app.listen(config.port, config.host, () => {
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : config.port;
    console.log(`Graph Tester listening on http://${config.browserHost}:${port}`);
    console.log(`Graph Tester redirect URI: ${config.graphRedirectUri}`);
    console.log(`Graph Tester token cache: ${config.tokenCacheFile}`);
    void authStore.bootstrap().catch((error) => {
      console.error(`Graph Tester auth bootstrap failed: ${error.message}`);
    });
  });

  const ready = server.listening
    ? Promise.resolve()
    : new Promise((resolve) => {
        server.once("listening", resolve);
      });

  return {
    app,
    authStore,
    config,
    server,
    ready,
    dispose: async () => undefined,
  };
}

const currentFile = fileURLToPath(import.meta.url);

if (process.argv[1] === currentFile) {
  startGraphTesterServer();
}
