import { readFile, readdir, stat } from "node:fs/promises";
import { join, relative, extname } from "node:path";

const INCLUDE_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx"]);

// Hard-coded, not configurable-off: never index dependency trees, VCS
// internals, build output, local auth/session state, or browser profile data.
const EXCLUDE_DIR_NAMES = new Set([
  "node_modules",
  ".git",
  ".local-auth",
  ".local-state",
  ".local-browser",
  "dist",
  "build",
  "coverage",
  ".next",
  "out",
  "graph-auths",
  ".vscode",
  "user-data",
  ".turbo",
]);

// Extension allowlist above is the binary-exclusion mechanism — only known
// text source extensions are ever read.
const MAX_FILE_BYTES = 1024 * 1024; // 1 MB
const CHUNK_LINES = 120;
const CHUNK_OVERLAP_LINES = 15;

// Conservative, literal-value-oriented patterns: matches "key: 'actualsecret'"
// shapes, not references like `apiKey: config.openAiApiKey`. False negatives
// are safer here than false positives that make normal code un-indexable.
const SECRET_PATTERNS = [
  /-----BEGIN[ A-Z]*PRIVATE KEY-----/,
  /\bbearer\s+[a-z0-9\-._~+/]{20,}=*/i,
  /(api[_-]?key|apikey|access[_-]?token|refresh[_-]?token|client[_-]?secret|secret[_-]?key|password)\s*[:=]\s*["'][^"'\s]{8,}["']/i,
  /(postgres|postgresql|mysql|mongodb|mssql):\/\/[^\s"']+:[^\s"']+@/i,
  /authorization\s*:\s*["']?bearer\s+[a-z0-9\-._~+/]{10,}/i,
  /AKIA[0-9A-Z]{16}/,
];

export async function loadCodeChunks(repoRoot, { includeDirs = ["src/server", "frontend/src"], extraFiles = ["package.json"] } = {}) {
  const files = [];

  for (const dir of includeDirs) {
    files.push(...(await findSourceFiles(join(repoRoot, dir))));
  }
  for (const relPath of extraFiles) {
    const abs = join(repoRoot, relPath);
    if (await pathExists(abs)) files.push(abs);
  }

  const chunks = [];
  for (const filePath of files) {
    const relPath = relative(repoRoot, filePath).replace(/\\/g, "/");
    let content;
    let fileStat;
    try {
      fileStat = await stat(filePath);
      if (fileStat.size > MAX_FILE_BYTES) continue;
      content = await readFile(filePath, "utf8");
    } catch {
      continue;
    }

    chunks.push(...chunkBySize(content, relPath, fileStat.mtimeMs));
  }

  return chunks;
}

async function findSourceFiles(dir) {
  const results = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue; // .env*, dotfiles, dotdirs

    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (EXCLUDE_DIR_NAMES.has(entry.name)) continue;
      results.push(...(await findSourceFiles(fullPath)));
    } else if (entry.isFile() && INCLUDE_EXTENSIONS.has(extname(entry.name))) {
      results.push(fullPath);
    }
  }
  return results;
}

function chunkBySize(content, relPath, mtime) {
  const lines = content.split("\n");
  const step = CHUNK_LINES - CHUNK_OVERLAP_LINES;
  const chunks = [];

  for (let start = 0; start < lines.length; start += step) {
    const end = Math.min(start + CHUNK_LINES, lines.length);
    const text = lines.slice(start, end).join("\n").trim();

    if (text.length >= 30) {
      if (containsLikelySecret(text)) {
        console.warn(`[codeKb] Skipped chunk with likely secret pattern: ${relPath}:${start + 1}`);
      } else {
        chunks.push({
          id: `${relPath}#${start + 1}-${end}`,
          docPath: relPath,
          heading: relPath,
          text,
          mtime,
          startLine: start + 1,
          endLine: end,
        });
      }
    }

    if (end >= lines.length) break;
  }

  return chunks;
}

function containsLikelySecret(text) {
  return SECRET_PATTERNS.some((pattern) => pattern.test(text));
}

async function pathExists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}
