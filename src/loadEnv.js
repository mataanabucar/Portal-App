import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, "..");

// Use the repo-local .env as the source of truth for this workspace, even if
// the machine already has older GRAPH_* environment variables defined.
dotenv.config({
  path: path.join(repoRoot, ".env"),
  override: true,
  quiet: true,
});
