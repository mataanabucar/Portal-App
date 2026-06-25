"use client";

import { useEffect, useRef, useState } from "react";
import { X, Send, FlaskConical, User, Bot } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";

interface ResearchTestModalProps {
  open: boolean;
  onClose: () => void;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  provider?: string;
  model?: string;
  error?: boolean;
}

export function ResearchTestModal({ open, onClose }: ResearchTestModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setMessages([]);
      setInput("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  if (!open) return null;

  async function handleSend() {
    const prompt = input.trim();
    if (!prompt || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: prompt }]);
    setLoading(true);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data?.error ?? res.statusText, error: true },
        ]);
        return;
      }

      if (!data.enabled) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.reason ?? "LLM is not enabled.", error: true },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer ?? "(empty response)",
          provider: data.provider,
          model: data.model,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: (err as Error).message, error: true },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />

      <div className="relative z-10 flex flex-col w-full max-w-2xl h-[80vh] bg-[#0a0e1a] border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-950/60 border border-emerald-700/40 shrink-0">
              <FlaskConical className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-[0.7rem] font-semibold tracking-[0.2em] text-emerald-400 uppercase">
                LLM Test
              </p>
              <p className="text-sm font-semibold text-slate-200">Direct model query — no external services</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3 text-slate-600">
              <FlaskConical className="w-10 h-10 opacity-30" />
              <p className="text-sm">Ask the LLM anything. Hits <code className="font-mono text-xs bg-slate-800 px-1 py-0.5 rounded">/api/ask</code> directly.</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-lg bg-emerald-950/60 border border-emerald-700/40 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-emerald-400" />
                </div>
              )}

              <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-violet-900/40 border border-violet-700/40 text-slate-200 text-sm"
                  : msg.error
                    ? "bg-red-950/30 border border-red-800/40 text-red-300 text-sm"
                    : "bg-slate-900/60 border border-slate-800/60 text-slate-200"
              }`}>
                {msg.role === "assistant" && !msg.error ? (
                  <>
                    <div className="prose prose-sm prose-invert max-w-none text-slate-200 text-sm leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:pl-4 [&_ol]:pl-4 [&_code]:text-emerald-300 [&_code]:bg-slate-900/60 [&_code]:rounded [&_code]:px-1 [&_pre]:bg-slate-950 [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:overflow-x-auto">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    </div>
                    {(msg.provider || msg.model) && (
                      <p className="text-[0.6rem] text-slate-600 mt-2 font-mono">
                        {[msg.provider, msg.model].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                )}
              </div>

              {msg.role === "user" && (
                <div className="w-7 h-7 rounded-lg bg-violet-950/60 border border-violet-700/40 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5 text-violet-400" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="w-7 h-7 rounded-lg bg-emerald-950/60 border border-emerald-700/40 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="bg-slate-900/60 border border-slate-800/60 rounded-2xl px-4 py-3 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="shrink-0 border-t border-slate-800/70 px-4 py-3 flex items-end gap-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask the LLM something… (Enter to send, Shift+Enter for newline)"
            disabled={loading}
            rows={1}
            className="flex-1 resize-none bg-slate-900/70 border border-slate-700/60 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/60 disabled:opacity-40 max-h-32 overflow-y-auto"
            style={{ lineHeight: "1.5" }}
          />
          <Button
            variant="outline"
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="rounded-xl border-emerald-600/40 text-emerald-300 hover:border-emerald-400 shrink-0 h-10 w-10 p-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
