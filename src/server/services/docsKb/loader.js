import { readFile, readdir, stat } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const CSV_ROWS_PER_CHUNK = 30;
const TXT_CHUNK_MAX_CHARS = 1500;

const DOCUMENT_LOADERS = {
  ".md": chunkMarkdownByHeadings,
  ".csv": chunkCsvByRows,
  ".txt": chunkPlainTextByParagraphs,
};

export async function loadDocChunks(docsDir) {
  const docFiles = await findSupportedDocFiles(docsDir);
  const chunks = [];
  // One ingest timestamp per loadDocChunks() call — records when this
  // ingestion pass ran, distinct from `mtime` (when the source file itself
  // last changed, i.e. its version). Re-embedding still only happens when
  // buildStore's cache key (model + docPath/mtime pairs) actually changes.
  const ingestTime = new Date().toISOString();

  for (const filePath of docFiles) {
    const relPath = relative(docsDir, filePath).replace(/\\/g, "/");
    const [content, fileStat] = await Promise.all([
      readFile(filePath, "utf8"),
      stat(filePath),
    ]);
    const loader = DOCUMENT_LOADERS[extname(filePath).toLowerCase()];
    if (!loader) continue;

    const rawChunks = loader(content, relPath, fileStat.mtimeMs);
    for (const chunk of rawChunks) {
      chunks.push({ ...chunk, filename: basename(relPath), ingestTime });
    }
  }

  return chunks;
}

async function findSupportedDocFiles(dir) {
  const results = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...await findSupportedDocFiles(fullPath));
      } else if (entry.isFile() && DOCUMENT_LOADERS[extname(entry.name).toLowerCase()]) {
        results.push(fullPath);
      }
    }
  } catch {
    // docs dir missing or unreadable
  }
  return results;
}

function chunkMarkdownByHeadings(content, docPath, mtime) {
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

function chunkCsvByRows(content, docPath, mtime) {
  const rows = parseCsv(content).filter((row) => row.some((value) => value.trim()));
  if (rows.length < 2) return [];

  const headers = rows[0].map((header, index) => header.trim() || `Column ${index + 1}`);
  const dataRows = rows.slice(1);
  const chunks = [];

  for (let start = 0; start < dataRows.length; start += CSV_ROWS_PER_CHUNK) {
    const selectedRows = dataRows.slice(start, start + CSV_ROWS_PER_CHUNK);
    const end = start + selectedRows.length;
    const rowText = selectedRows
      .map((row, index) => formatCsvRow(headers, row, start + index + 1))
      .join("\n");
    const text = [
      `CSV file: ${docPath}`,
      `Columns: ${headers.join(", ")}`,
      `Rows ${start + 1}-${end}:`,
      rowText,
    ].join("\n");

    if (text.trim().length < 50) continue;
    chunks.push({
      id: `${docPath}#rows-${start + 1}-${end}`,
      docPath,
      heading: `${fileTitle(docPath)} rows ${start + 1}-${end}`,
      text,
      mtime,
    });
  }

  return chunks;
}

// Chunks on paragraph boundaries (blank-line separated) first, packing
// consecutive paragraphs together up to TXT_CHUNK_MAX_CHARS. A single
// paragraph larger than the limit is hard-sliced as a last resort so no
// chunk ever exceeds the cap, while normal paragraphs stay intact.
function chunkPlainTextByParagraphs(content, docPath, mtime) {
  const paragraphs = content
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks = [];
  let buffer = [];
  let bufferLen = 0;
  let partIndex = 1;

  const flush = () => {
    if (buffer.length === 0) return;
    const text = buffer.join("\n\n").trim();
    buffer = [];
    bufferLen = 0;
    if (text.length < 50) return;
    chunks.push({
      id: `${docPath}#part-${partIndex}`,
      docPath,
      heading: `${fileTitle(docPath)} (part ${partIndex})`,
      text,
      mtime,
    });
    partIndex += 1;
  };

  for (const paragraph of paragraphs) {
    if (paragraph.length > TXT_CHUNK_MAX_CHARS) {
      flush();
      for (let i = 0; i < paragraph.length; i += TXT_CHUNK_MAX_CHARS) {
        const slice = paragraph.slice(i, i + TXT_CHUNK_MAX_CHARS).trim();
        if (slice.length < 50) continue;
        chunks.push({
          id: `${docPath}#part-${partIndex}`,
          docPath,
          heading: `${fileTitle(docPath)} (part ${partIndex})`,
          text: slice,
          mtime,
        });
        partIndex += 1;
      }
      continue;
    }

    if (buffer.length > 0 && bufferLen + paragraph.length > TXT_CHUNK_MAX_CHARS) {
      flush();
    }
    buffer.push(paragraph);
    bufferLen += paragraph.length + 2;
  }
  flush();

  return chunks;
}

function formatCsvRow(headers, row, rowNumber) {
  const fields = headers
    .map((header, index) => {
      const value = (row[index] ?? "").trim();
      return value ? `${header}: ${value}` : "";
    })
    .filter(Boolean);
  return `Row ${rowNumber}: ${fields.join("; ")}`;
}

function parseCsv(content) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];

    if (inQuotes) {
      if (char === '"' && content[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      if (char === "\r" && content[index + 1] === "\n") index += 1;
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function fileTitle(docPath) {
  return docPath.split("/").pop()?.replace(/\.[^.]+$/, "") ?? docPath;
}

function basename(docPath) {
  return docPath.split("/").pop() ?? docPath;
}
