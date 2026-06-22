import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// The standalone Graph Tester Express server (src/graph-tester) owns every
// /api and /auth route. In dev we proxy those to it so the Vue client stays
// pure UI and never talks to Microsoft Graph directly. Default matches
// GRAPH_TESTER_HOST/PORT (127.0.0.1:3069); override with GRAPH_TESTER_PROXY_TARGET.
const proxyTarget =
  process.env.GRAPH_TESTER_PROXY_TARGET || "http://127.0.0.1:3069";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      "/api": { target: proxyTarget, changeOrigin: true },
      // /auth/login issues a 302 to Microsoft; /auth/redirect lands back on the
      // Express origin. Pass both through untouched so the OAuth round-trip works.
      "/auth": { target: proxyTarget, changeOrigin: true },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
