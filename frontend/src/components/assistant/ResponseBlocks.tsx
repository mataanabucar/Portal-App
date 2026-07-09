"use client";

import { FileCode, FileText } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type {
  ActionItemData,
  AssistantSource,
  ResponseBlock,
  TableBlockData,
} from "@/lib/assistantChat";
import { MermaidDiagram } from "@/components/MermaidDiagram";

// Renders the orchestrator's structured response blocks. Everything goes
// through JSX text nodes — no dangerouslySetInnerHTML anywhere. Image URLs
// are restricted to http/https or app-relative paths.

export function ResponseBlocks({ blocks }: { blocks: ResponseBlock[] }) {
  return (
    <div className="space-y-2">
      {blocks.map((block, index) => (
        <BlockRenderer key={index} block={block} />
      ))}
    </div>
  );
}

function BlockRenderer({ block }: { block: ResponseBlock }) {
  switch (block.type) {
    case "text":
      return <TextWithDiagrams text={block.text} />;
    case "summary":
      return (
        <div className="rounded-2xl border border-slate-700/80 bg-slate-950/40 p-3">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            {block.title || "Summary"}
          </p>
          <p className="whitespace-pre-wrap">{block.text}</p>
        </div>
      );
    case "table":
      return <BlockTable table={block} />;
    case "actions":
      return (
        <div className="space-y-1.5">
          {block.items.map((item, index) => (
            <ActionItemCard key={index} item={item} />
          ))}
        </div>
      );
    case "sources":
      return (
        <div className="flex flex-wrap gap-1.5">
          {block.sources.map((source, index) => (
            <BlockSourceChip key={`${source.path}-${index}`} source={source} />
          ))}
        </div>
      );
    case "image":
      return isSafeImageUrl(block.url) ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote hosts
        // aren't preconfigured for next/image; plain img with a strict URL
        // allowlist is the deliberate choice here.
        <img
          src={block.url}
          alt={block.alt || "Image"}
          loading="lazy"
          className="max-w-full rounded-2xl border border-slate-700/80"
        />
      ) : null;
    case "chart":
      return (
        <div className="rounded-2xl border border-slate-700/80 bg-slate-950/40 p-3">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            {block.title || "Chart"}
          </p>
          {block.table ? (
            <BlockTable table={block.table} />
          ) : (
            <pre className="overflow-x-auto text-xs text-slate-300">
              {JSON.stringify(block, null, 2)}
            </pre>
          )}
        </div>
      );
    default:
      return null;
  }
}

// Text blocks may carry ```mermaid fences (e.g. a KB answer describing a
// workflow). Render those as live diagrams and everything around them as
// plain pre-wrapped text.
const MERMAID_FENCE = /```mermaid\s*\n([\s\S]*?)```/g;

function TextWithDiagrams({ text }: { text: string }) {
  const value = text || "";
  if (!value.includes("```mermaid")) {
    return <MarkdownText content={value} />;
  }

  const parts: Array<{ kind: "text" | "mermaid"; content: string }> = [];
  let lastIndex = 0;
  for (const match of value.matchAll(MERMAID_FENCE)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      parts.push({ kind: "text", content: value.slice(lastIndex, index) });
    }
    parts.push({ kind: "mermaid", content: match[1] });
    lastIndex = index + match[0].length;
  }
  if (lastIndex < value.length) {
    parts.push({ kind: "text", content: value.slice(lastIndex) });
  }

  return (
    <div className="space-y-2">
      {parts.map((part, index) =>
        part.kind === "mermaid" ? (
          <MermaidDiagram key={index} code={part.content} />
        ) : (
          part.content.trim() && <MarkdownText key={index} content={part.content} />
        )
      )}
    </div>
  );
}

// KB/GennyStudio answers arrive as markdown (headings, bold, tables) — render
// them as formatted HTML via react-markdown (JSX output, no raw HTML pass-
// through), matching the panel's slate palette.
function MarkdownText({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => (
          <p className="mb-2 whitespace-pre-wrap leading-6 last:mb-0">{children}</p>
        ),
        h1: ({ children }) => (
          <p className="mb-1 mt-2 text-sm font-bold text-slate-100">{children}</p>
        ),
        h2: ({ children }) => (
          <p className="mb-1 mt-2 text-sm font-bold text-slate-100">{children}</p>
        ),
        h3: ({ children }) => (
          <p className="mb-1 mt-2 text-sm font-semibold text-slate-100">{children}</p>
        ),
        h4: ({ children }) => (
          <p className="mb-1 mt-2 text-sm font-semibold text-slate-200">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="mb-2 list-disc list-outside space-y-0.5 pl-4">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="mb-2 list-decimal list-outside space-y-0.5 pl-4">{children}</ol>
        ),
        li: ({ children }) => <li className="leading-6">{children}</li>,
        strong: ({ children }) => (
          <strong className="font-semibold text-slate-50">{children}</strong>
        ),
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-violet-300 underline underline-offset-2 hover:text-violet-200 break-all"
          >
            {children}
          </a>
        ),
        code: ({ className, children }) => {
          if (className === "language-mermaid") {
            return <MermaidDiagram code={String(children)} />;
          }
          return (
            <code className="rounded bg-slate-900/60 px-1 py-0.5 text-xs font-mono text-emerald-300">
              {children}
            </code>
          );
        },
        pre: ({ children }) => (
          <pre className="mb-2 overflow-x-auto rounded-lg border border-slate-700/80 bg-slate-950/60 p-2 text-xs">
            {children}
          </pre>
        ),
        table: ({ children }) => (
          <div className="mb-2 overflow-x-auto">
            <table className="w-full min-w-[320px] border-collapse text-left text-xs">
              {children}
            </table>
          </div>
        ),
        th: ({ children }) => (
          <th className="border-b border-slate-700/80 px-2 py-1.5 font-semibold text-slate-300">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border-b border-slate-800/60 px-2 py-1.5 align-top text-slate-200">
            {children}
          </td>
        ),
        hr: () => <hr className="my-2 border-slate-800/80" />,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function BlockTable({ table }: { table: TableBlockData }) {
  return (
    <div className="overflow-x-auto">
      {table.title && (
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          {table.title}
        </p>
      )}
      <table className="w-full min-w-[320px] border-collapse text-left text-xs">
        <thead>
          <tr>
            {table.columns.map((column, index) => (
              <th
                key={index}
                className="border-b border-slate-700/80 px-2 py-1.5 font-semibold text-slate-300"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className="border-b border-slate-800/60 px-2 py-1.5 align-top text-slate-200"
                >
                  {String(cell ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ActionItemCard({ item }: { item: ActionItemData }) {
  const meta = [item.owner, item.dueDate, item.priority, item.status]
    .filter(Boolean)
    .join(" · ");
  return (
    <div className="rounded-2xl border border-slate-700/80 bg-slate-950/40 px-3 py-2">
      <p className="text-sm text-slate-100">{item.title}</p>
      {meta && <p className="mt-0.5 text-xs text-slate-400">{meta}</p>}
      {item.sourceText && (
        <p className="mt-0.5 text-xs italic text-slate-500">{item.sourceText}</p>
      )}
    </div>
  );
}

function BlockSourceChip({ source }: { source: AssistantSource }) {
  const Icon = source.type === "code" ? FileCode : FileText;
  return (
    <span
      title={source.snippet}
      className="inline-flex max-w-[220px] items-center gap-1 truncate rounded-full border border-slate-700/80 bg-slate-950/60 px-2.5 py-1 text-[11px] text-slate-300"
    >
      <Icon className="h-3 w-3 shrink-0" />
      <span className="truncate">{source.path || source.title}</span>
    </span>
  );
}

function isSafeImageUrl(url: string): boolean {
  if (typeof url !== "string" || !url) return false;
  if (/^https?:\/\//i.test(url)) return true;
  return url.startsWith("/") && !url.startsWith("//");
}
