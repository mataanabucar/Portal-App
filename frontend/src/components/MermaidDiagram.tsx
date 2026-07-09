"use client";

import { useEffect, useRef, useState } from "react";

// Renders a mermaid definition (flowchart, sequence, gantt, pie, ...) to an
// inline SVG. The library is imported lazily so the ~1MB bundle only loads
// when a diagram is actually on screen. securityLevel "strict" keeps mermaid
// sanitizing the untrusted definition text (no click handlers / scripts); the
// SVG we inject comes from mermaid's own sanitized renderer, never from raw
// model output.

let mermaidInitialized = false;
let renderCounter = 0;

export function MermaidDiagram({ code }: { code: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const definition = (code || "").trim();
    if (!definition) return;

    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        if (!mermaidInitialized) {
          mermaid.initialize({
            startOnLoad: false,
            securityLevel: "strict",
            theme: "dark",
            darkMode: true,
            fontFamily: "inherit",
          });
          mermaidInitialized = true;
        }
        renderCounter += 1;
        const { svg } = await mermaid.render(`mermaid-diagram-${renderCounter}`, definition);
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
          setError(null);
        }
      } catch (renderError) {
        if (!cancelled) {
          setError(
            renderError instanceof Error ? renderError.message : "Diagram failed to render."
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code]);

  if (error) {
    return (
      <div className="rounded-lg border border-slate-800/60 bg-slate-950/70 p-3">
        <p className="mb-1 text-[11px] text-amber-300">
          Mermaid diagram could not be rendered — showing source.
        </p>
        <pre className="overflow-x-auto whitespace-pre-wrap text-xs font-mono text-emerald-300">
          {code}
        </pre>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="my-2 overflow-x-auto rounded-lg border border-slate-800/60 bg-slate-950/70 p-3 [&_svg]:mx-auto [&_svg]:max-w-full"
    />
  );
}
