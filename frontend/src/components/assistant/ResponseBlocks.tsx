"use client";

import { Check, Copy, FileCode, FileText } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useState } from "react";
import { MermaidDiagram } from "@/components/MermaidDiagram";
import {
  looksLikeHtmlContent,
  sanitizeHtmlContent,
} from "@/lib/sanitizeHtml";
import type {
  ActionItemData,
  AssistantSource,
  ResponseBlock,
  TableBlockData,
} from "@/lib/assistantChat";

const SPECIAL_FENCE = /```(mermaid|html)\s*\n([\s\S]*?)```/g;

export function CopyResponseButton({ text }: { text: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");
  const canCopy = Boolean(text.trim());
  const label =
    status === "copied"
      ? "Response copied"
      : status === "error"
        ? "Copy failed"
        : "Copy response";

  async function handleCopy() {
    if (!canCopy) {
      return;
    }

    try {
      await writeClipboardText(text);
      setStatus("copied");
    } catch {
      setStatus("error");
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      disabled={!canCopy}
      aria-label={label}
      title={label}
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-700/80 bg-slate-950/45 text-slate-400 transition-colors hover:border-cyan-500/50 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {status === "copied" ? (
        <Check className="h-3.5 w-3.5 text-emerald-300" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

export function ResponseBlocks({
  blocks,
  showSources = true,
}: {
  blocks: ResponseBlock[];
  showSources?: boolean;
}) {
  return (
    <div className="space-y-2">
      {blocks.map((block, index) => (
        <BlockRenderer
          key={index}
          block={block}
          showSources={showSources}
        />
      ))}
    </div>
  );
}

export function RichText({ content }: { content: string }) {
  const value = content || "";
  if (!value.includes("```mermaid") && !value.includes("```html")) {
    if (looksLikeHtmlContent(value)) {
      return <HtmlPreview html={value} />;
    }
    return <MarkdownText content={value} />;
  }

  const parts: Array<{ kind: "text" | "mermaid" | "html"; content: string }> =
    [];
  let lastIndex = 0;

  for (const match of value.matchAll(SPECIAL_FENCE)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      parts.push({ kind: "text", content: value.slice(lastIndex, index) });
    }
    parts.push({
      kind: match[1] === "html" ? "html" : "mermaid",
      content: match[2],
    });
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
        ) : part.kind === "html" ? (
          <HtmlPreview key={index} html={part.content} />
        ) : part.content.trim() ? (
          <MarkdownText key={index} content={part.content} />
        ) : null
      )}
    </div>
  );
}

function HtmlPreview({ html }: { html: string }) {
  const sanitizedHtml = sanitizeHtmlContent(html);

  if (!sanitizedHtml) {
    return null;
  }

  return (
    <div className="overflow-x-auto rounded-[22px] border border-slate-700/80 bg-white p-3 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]">
      <div
        className="assistant-rendered-html prose prose-sm max-w-none text-slate-900 prose-headings:text-slate-900 prose-p:text-slate-800 prose-strong:text-slate-900 prose-a:text-cyan-700 prose-code:text-slate-900"
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      />
    </div>
  );
}

export function SourceChip({
  source,
  className,
}: {
  source: AssistantSource;
  className?: string;
}) {
  const Icon = source.type === "code" ? FileCode : FileText;
  const lineRange =
    source.type === "code" && source.startLine
      ? `:${source.startLine}${
          source.endLine && source.endLine !== source.startLine
            ? `-${source.endLine}`
            : ""
        }`
      : "";
  const label = source.path || source.title || source.id || "Source";

  return (
    <span
      title={source.snippet}
      className={[
        "inline-flex max-w-[240px] items-center gap-1 truncate rounded-full border border-slate-700/80 bg-slate-950/60 px-2.5 py-1 text-[11px] text-slate-300",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Icon className="h-3 w-3 shrink-0" />
      <span className="truncate">
        {label}
        {lineRange}
      </span>
    </span>
  );
}

function BlockRenderer({
  block,
  showSources,
}: {
  block: ResponseBlock;
  showSources: boolean;
}) {
  switch (block.type) {
    case "text":
      return <RichText content={block.text} />;
    case "summary":
      return (
        <div className="rounded-[22px] border border-slate-700/80 bg-slate-950/40 p-3">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            {block.title || "Summary"}
          </p>
          <RichText content={block.text} />
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
      return showSources ? (
        <div className="flex flex-wrap gap-1.5">
          {block.sources.map((source, index) => (
            <SourceChip key={`${source.path}-${index}`} source={source} />
          ))}
        </div>
      ) : null;
    case "image":
      return isSafeImageUrl(block.url) ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote hosts
        // are not preconfigured for next/image in this app.
        <img
          src={block.url}
          alt={block.alt || "Image"}
          loading="lazy"
          className="max-w-full rounded-[22px] border border-slate-700/80"
        />
      ) : null;
    case "chart":
      return (
        <div className="rounded-[22px] border border-slate-700/80 bg-slate-950/40 p-3">
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

function MarkdownText({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => (
          <p className="mb-2 whitespace-pre-wrap leading-6 last:mb-0">
            {children}
          </p>
        ),
        h1: ({ children }) => (
          <p className="mb-1 mt-2 text-sm font-bold text-slate-100">
            {children}
          </p>
        ),
        h2: ({ children }) => (
          <p className="mb-1 mt-2 text-sm font-bold text-slate-100">
            {children}
          </p>
        ),
        h3: ({ children }) => (
          <p className="mb-1 mt-2 text-sm font-semibold text-slate-100">
            {children}
          </p>
        ),
        h4: ({ children }) => (
          <p className="mb-1 mt-2 text-sm font-semibold text-slate-200">
            {children}
          </p>
        ),
        ul: ({ children }) => (
          <ul className="mb-2 list-disc list-outside space-y-0.5 pl-4">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="mb-2 list-decimal list-outside space-y-0.5 pl-4">
            {children}
          </ol>
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
            className="break-all text-violet-300 underline underline-offset-2 hover:text-violet-200"
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
    .join(" | ");

  return (
    <div className="rounded-[22px] border border-slate-700/80 bg-slate-950/40 px-3 py-2">
      <p className="text-sm text-slate-100">{item.title}</p>
      {meta && <p className="mt-0.5 text-xs text-slate-400">{meta}</p>}
      {item.sourceText && (
        <p className="mt-0.5 text-xs italic text-slate-500">
          {item.sourceText}
        </p>
      )}
    </div>
  );
}

function isSafeImageUrl(url: string): boolean {
  if (typeof url !== "string" || !url) {
    return false;
  }
  if (/^https?:\/\//i.test(url)) {
    return true;
  }
  return url.startsWith("/") && !url.startsWith("//");
}

async function writeClipboardText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();

  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) {
    throw new Error("Clipboard access is unavailable.");
  }
}
