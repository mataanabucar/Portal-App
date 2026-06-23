"use client";

import { useEffect, useRef, useState } from "react";
import { X, Send, ExternalLink, ChevronDown, Search } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { PillProgress3D } from "@/components/ui/PillProgress3D";
import { api } from "@/lib/api";
import type { DashboardCardItem, ResearchMessage, RetrievalStep } from "@/lib/types";

interface ResearchModalProps {
  open: boolean;
  onClose: () => void;
  item: DashboardCardItem;
}

interface ThreadMessage {
  role: "user" | "assistant";
  content: string;
  retrievalTrail?: RetrievalStep[];
}

function buildItemContext(item: DashboardCardItem): string {
  const kd = (label: string) =>
    item.keyDetails.find((r) => r.label === label)?.value ?? "";

  const lines = [
    `Title: ${item.title}`,
    item.summary && `Summary: ${item.summary}`,
    item.nextAction && `Next Action: ${item.nextAction}`,
    item.blockersOpenQuestions.length > 0 &&
      `Blockers: ${item.blockersOpenQuestions.join("; ")}`,
    kd("Related Action Item") && `Related Action Item: ${kd("Related Action Item")}`,
    kd("Application") && `Application: ${kd("Application")}`,
    kd("Request Type") && `Request Type: ${kd("Request Type")}`,
    kd("Request ID") && `Request ID: ${kd("Request ID")}`,
    kd("Business / Customer") && `Customer: ${kd("Business / Customer")}`,
    kd("References / Fields") && `References / Fields: ${kd("References / Fields")}`,
  ].filter(Boolean);

  return lines.join("\n");
}

function buildInitialQuery(item: DashboardCardItem): string {
  return (
    `Research this portal item and help me understand how to resolve it.\n\n` +
    `Find relevant code, existing feature implementations, known limitations, ` +
    `and any patterns in the codebase that would help address this request.`
  );
}

export function ResearchModal({ open, onClose, item }: ResearchModalProps) {
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [lastChatUrl, setLastChatUrl] = useState<string | null>(null);
  const crawlRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const itemContext = buildItemContext(item);

  // Crawl animation while loading
  useEffect(() => {
    if (loading) {
      setLoadProgress(0);
      crawlRef.current = setInterval(() => {
        setLoadProgress((p) => p + Math.max(0.4, (85 - p) * 0.045));
      }, 120);
    } else {
      if (crawlRef.current) clearInterval(crawlRef.current);
      if (messages.length > 0) setLoadProgress(100);
    }
    return () => { if (crawlRef.current) clearInterval(crawlRef.current); };
  }, [loading, messages.length]);

  // Auto-scroll thread to bottom
  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Fire initial query when modal opens
  useEffect(() => {
    if (!open) return;
    setMessages([]);
    setInput("");
    setLastChatUrl(null);
    setLoadProgress(0);
    sendMessage(buildInitialQuery(item), []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Focus input after first response
  useEffect(() => {
    if (!loading && messages.length > 0) {
      inputRef.current?.focus();
    }
  }, [loading, messages.length]);

  async function sendMessage(query: string, history: ThreadMessage[]) {
    setLoading(true);
    // Build the ResearchMessage history (strip retrievalTrail)
    const apiHistory: ResearchMessage[] = history.map((m) => ({
      role: m.role,
      content: m.content,
    }));
    try {
      const res = await api.research({ query, messages: apiHistory, itemContext });
      if (res.chatUrl) setLastChatUrl(res.chatUrl);
      setMessages((prev) => [
        ...prev,
        { role: "user", content: query },
        { role: "assistant", content: res.answer, retrievalTrail: res.retrievalTrail },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "user", content: query },
        { role: "assistant", content: `Error: ${(err as Error).message}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSend() {
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    sendMessage(q, messages);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative z-10 flex flex-col w-full max-w-2xl h-[82vh] bg-[#0f1623] border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50 shrink-0">
          <div className="min-w-0 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full flex items-center justify-center bg-violet-950/50 border border-violet-700/30 shrink-0">
              <Search className="w-3.5 h-3.5 text-violet-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-widest text-violet-400 uppercase mb-0.5">
                Sourcebot Research
              </p>
              <p className="text-sm text-slate-300 truncate">{item.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-4 shrink-0">
            {lastChatUrl && (
              <a
                href={lastChatUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-violet-300 transition-colors"
                title="View in Sourcebot"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Thread */}
        <div ref={threadRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.map((msg, i) => (
            <MessageBubble key={i} message={msg} />
          ))}
          {loading && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <PillProgress3D
                progress={loadProgress}
                label="RESEARCHING CODEBASE..."
                width={380}
                height={52}
              />
              <p className="text-xs text-slate-500">Searching Benchmark Digital repos…</p>
            </div>
          )}
          {loading && messages.length > 0 && (
            <div className="flex justify-start">
              <div className="bg-slate-800/60 border border-slate-700/40 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]">
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <span className="animate-pulse">●</span>
                  <span className="animate-pulse" style={{ animationDelay: "0.2s" }}>●</span>
                  <span className="animate-pulse" style={{ animationDelay: "0.4s" }}>●</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input bar */}
        <div className="shrink-0 border-t border-slate-700/50 px-4 py-3 flex items-end gap-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a follow-up question…"
            disabled={loading}
            rows={1}
            className="flex-1 resize-none bg-slate-800/60 border border-slate-600/50 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500/60 disabled:opacity-40 max-h-28 overflow-y-auto"
            style={{ lineHeight: "1.5" }}
          />
          <Button
            variant="outline"
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="rounded-xl border-violet-600/40 text-violet-300 hover:border-violet-400 shrink-0 h-10 w-10 p-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ThreadMessage }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="bg-violet-900/30 border border-violet-700/25 rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[80%]">
          <p className="text-sm text-violet-100 whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-start">
        <div className="bg-slate-800/60 border border-slate-700/40 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[92%] min-w-0">
          <MarkdownBody content={message.content} />
        </div>
      </div>
      {message.retrievalTrail && message.retrievalTrail.length > 0 && (
        <RetrievalTrail steps={message.retrievalTrail} />
      )}
    </div>
  );
}

function MarkdownBody({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 className="text-base font-bold text-slate-100 mt-3 mb-1.5 first:mt-0">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-sm font-bold text-slate-100 mt-3 mb-1 first:mt-0">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-sm font-semibold text-slate-200 mt-2.5 mb-1 first:mt-0">{children}</h3>
        ),
        h4: ({ children }) => (
          <h4 className="text-xs font-semibold text-slate-300 mt-2 mb-0.5 first:mt-0">{children}</h4>
        ),
        p: ({ children }) => (
          <p className="text-sm text-slate-200 leading-relaxed mb-2 last:mb-0">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="list-disc list-outside pl-4 mb-2 space-y-0.5 text-sm text-slate-200">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-outside pl-4 mb-2 space-y-0.5 text-sm text-slate-200">{children}</ol>
        ),
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        strong: ({ children }) => (
          <strong className="font-semibold text-slate-100">{children}</strong>
        ),
        em: ({ children }) => <em className="italic text-slate-300">{children}</em>,
        hr: () => <hr className="border-slate-700/50 my-3" />,
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-violet-600/50 pl-3 my-2 text-slate-400 italic text-sm">
            {children}
          </blockquote>
        ),
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-violet-400 hover:text-violet-300 underline underline-offset-2 break-all"
          >
            {children}
          </a>
        ),
        code: ({ className, children, ...props }) => {
          const isBlock = className?.startsWith("language-");
          if (isBlock) {
            return (
              <code className="block text-xs font-mono text-emerald-300 leading-relaxed whitespace-pre-wrap break-all">
                {children}
              </code>
            );
          }
          return (
            <code className="text-xs font-mono text-emerald-300 bg-slate-900/60 rounded px-1 py-0.5">
              {children}
            </code>
          );
        },
        pre: ({ children }) => (
          <pre className="bg-slate-900/70 border border-slate-700/40 rounded-lg p-3 my-2 overflow-x-auto text-xs">
            {children}
          </pre>
        ),
        table: ({ children }) => (
          <div className="overflow-x-auto my-2">
            <table className="text-xs text-slate-300 border-collapse w-full">{children}</table>
          </div>
        ),
        th: ({ children }) => (
          <th className="text-left text-slate-200 font-semibold border border-slate-700/40 px-2 py-1 bg-slate-800/50">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border border-slate-700/40 px-2 py-1">{children}</td>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function RetrievalTrail({ steps }: { steps: RetrievalStep[] }) {
  const [open, setOpen] = useState(false);
  const codeSteps = steps.filter((s) => s.tool !== "intent");

  return (
    <div className="ml-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-[0.68rem] text-slate-500 hover:text-slate-400 transition-colors"
      >
        <ChevronDown
          className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`}
        />
        {codeSteps.length} retrieval step{codeSteps.length !== 1 ? "s" : ""}
      </button>
      {open && (
        <div className="mt-1.5 space-y-1 pl-1 border-l border-slate-700/40">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="mt-0.5 shrink-0 text-[0.6rem] font-mono font-bold uppercase text-slate-600 w-20">
                {step.tool}
              </span>
              <span className="text-[0.7rem] text-slate-500 leading-snug">{step.summary}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
