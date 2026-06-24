import { readFile, readdir, stat } from "node:fs/promises";
import { join, relative } from "node:path";

export async function loadDocChunks(docsDir) {
  const mdFiles = await findMarkdownFiles(docsDir);
  const chunks = [];

  for (const filePath of mdFiles) {
    const relPath = relative(docsDir, filePath).replace(/\\/g, "/");
    const [content, fileStat] = await Promise.all([
      readFile(filePath, "utf8"),
      stat(filePath),
    ]);
    chunks.push(...chunkByHeadings(content, relPath, fileStat.mtimeMs));
  }

  return chunks;
}

async function findMarkdownFiles(dir) {
  const results = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...await findMarkdownFiles(fullPath));
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        results.push(fullPath);
      }
    }
  } catch {
    // docs dir missing or unreadable
  }
  return results;
}

function chunkByHeadings(content, docPath, mtime) {
  const lines = content.split("\n");
  const chunks = [];
  let currentHeading = "";
  let currentLines = [];

  const flush = () => {
    const text = currentLines.join("\n").trim();
    if (text.length < 50) return;
    chunks.push({
      id: `${docPath}#${slugify(currentHeading) || "intro"}`,
      docPath,
      heading: currentHeading || fileTitle(docPath),
      text,
      mtime,
    });
  };

  for (const line of lines) {
    const headingMatch = line.match(/^#{1,3}\s+(.+)/);
    if (headingMatch) {
      flush();
      currentHeading = headingMatch[1].trim();
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }
  flush();

  return chunks;
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function fileTitle(docPath) {
  return docPath.split("/").pop()?.replace(/\.md$/, "") ?? docPath;
}
