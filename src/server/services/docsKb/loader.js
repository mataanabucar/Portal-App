import { readFile, readdir, stat } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const CSV_ROWS_PER_CHUNK = 30;

const DOCUMENT_LOADERS = {
  ".md": chunkMarkdownByHeadings,
  ".csv": chunkCsvByRows,
};

export async function loadDocChunks(docsDir) {
  const docFiles = await findSupportedDocFiles(docsDir);
  const chunks = [];

  for (const filePath of docFiles) {
    const relPath = relative(docsDir, filePath).replace(/\\/g, "/");
    const [content, fileStat] = await Promise.all([
      readFile(filePath, "utf8"),
      stat(filePath),
    ]);
    const loader = DOCUMENT_LOADERS[extname(filePath).toLowerCase()];
    if (loader) chunks.push(...loader(content, relPath, fileStat.mtimeMs));
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
