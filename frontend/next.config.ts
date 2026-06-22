import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

// NOTE: API proxying is handled at runtime by src/app/api/[...path]/route.ts,
// not by a rewrite here. Rewrite destinations are baked into the build manifest
// at build time and cannot honor the desktop shell's dynamic BACKEND_URL.

const nextConfig: NextConfig = {
  output: "standalone",
  // Pin the workspace root to this app (multiple lockfiles exist in the repo).
  turbopack: {
    root: fileURLToPath(new URL(".", import.meta.url)),
  },
  // Allow loading the dev server / HMR over the LAN IP, not just localhost.
  allowedDevOrigins: ["100.96.5.37"],
};

export default nextConfig;
