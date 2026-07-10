"use client";

import { memo, useEffect, useRef, useState } from "react";

// Renders a mermaid definition (flowchart, sequence, gantt, pie, ...) to an
// inline SVG. The library is imported lazily so the ~1MB bundle only loads
// when a diagram is actually on screen. securityLevel "strict" keeps mermaid
// sanitizing the untrusted definition text (no click handlers / scripts); the
// SVG we inject comes from mermaid's own sanitized renderer, never from raw
// model output.

let mermaidInitialized = false;
let renderCounter = 0;

const EMPLOYEE_PHOTO_ENDPOINT = "/api/assistant/bamboo-image";
const BAMBOO_EMPLOYEE_IMAGE_RE = /^https?:\/\/images\d+\.bamboohr\.com\//i;
const BAMBOO_PLACEHOLDER_IMAGE_RE =
  /^https:\/\/resources\.bamboohr\.com\/images\/photo_person_160x160\.png$/i;
const IMAGE_SOURCE_RE =
  /(<img\b[^>]*\bsrc\s*=\s*)(["'])([^"']+)\2/gi;

// Memoized on `code`: a live voice session updates mic-meter state ~60fps,
// re-rendering the dock; without this the rendered SVG subtree would churn on
// every frame. The diagram only needs to re-render when the definition changes.
export const MermaidDiagram = memo(function MermaidDiagram({
  code,
}: {
  code: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const definition = normalizeMermaidImageSources(code || "").trim();
    if (!definition) return;

    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        if (!mermaidInitialized) {
          mermaid.initialize({
            startOnLoad: false,
            securityLevel: "loose",
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
});

function normalizeMermaidImageSources(definition: string): string {
  return definition.replace(
    IMAGE_SOURCE_RE,
    (fullMatch, prefix: string, quote: string, source: string) => {
      const normalizedSource = normalizeEmployeePhotoSource(source);
      return `${prefix}${quote}${normalizedSource}${quote}`;
    }
  );
}

function normalizeEmployeePhotoSource(source: string): string {
  const normalizedSource = source.trim().replace(/&amp;/gi, "&");

  if (normalizedSource.startsWith(`${EMPLOYEE_PHOTO_ENDPOINT}?`)) {
    return normalizedSource;
  }

  if (
    BAMBOO_EMPLOYEE_IMAGE_RE.test(normalizedSource) ||
    BAMBOO_PLACEHOLDER_IMAGE_RE.test(normalizedSource)
  ) {
    return buildEmployeePhotoUrl(normalizedSource);
  }

  return `${EMPLOYEE_PHOTO_ENDPOINT}?placeholder=1`;
}

function buildEmployeePhotoUrl(source: string): string {
  return `${EMPLOYEE_PHOTO_ENDPOINT}?url=${encodeURIComponent(source)}`;
}
