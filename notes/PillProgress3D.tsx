"use client";

/**
 * PillProgress3D
 * ──────────────
 * A 3-D–style pill loading bar with a liquid fill, specular highlight,
 * bottom depth shadow, right-edge glow, and a travelling shimmer stripe.
 *
 * Installation
 * ────────────
 *   npm install motion
 *
 * Usage
 * ─────
 *   import { PillProgress3D } from "./PillProgress3D";
 *
 *   <PillProgress3D progress={75} />
 *   <PillProgress3D progress={upload} label="UPLOADING..." width={600} height={80} />
 *   <PillProgress3D progress={100} label={null} />
 */

import { animate, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface PillProgress3DProps {
  /** Fill level 0–100. Animates smoothly whenever it changes. */
  progress?: number;
  /** Text displayed below the percentage. Pass null to hide. */
  label?: string | null;
  /** Show the animated numeric counter above the label. Default: true */
  showPercent?: boolean;
  /** Total bar width in px. Default: 480 */
  width?: number;
  /** Bar height (thickness) in px. Default: 72 */
  height?: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PillProgress3D({
  progress = 75,
  label = "LOADING...",
  showPercent = true,
  width = 480,
  height = 72,
}: PillProgress3DProps) {
  const pct = Math.min(100, Math.max(0, progress));
  const r   = height / 2; // pill border-radius

  // Numeric counter — springs from its current value to the new target
  const countRef = useRef(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const from     = countRef.current;
    const controls = animate(from, pct, {
      duration: 1.3,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        countRef.current = v;
        setCount(Math.round(v));
      },
    });
    return controls.stop;
  }, [pct]);

  // Outer glow scales with fill level
  const outerGlow = pct > 0
    ? `0 0 ${Math.round(r * 0.85)}px rgba(215,18,52,0.38), 0 0 ${Math.round(r * 1.6)}px rgba(180,0,30,0.20)`
    : null;

  return (
    <div
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 18,
      }}
    >
      {/* ── Outer glass capsule ─────────────────────────────────────────── */}
      <div
        style={{
          position: "relative",
          width,
          height,
          borderRadius: r,
          overflow: "hidden",
          // Dark glass body
          background:
            "linear-gradient(180deg, #2c2c2c 0%, #181818 55%, #252525 100%)",
          boxShadow: [
            "inset 0 4px 14px rgba(0,0,0,0.95)",
            "inset 0 -2px 6px rgba(255,255,255,0.04)",
            "0 8px 32px rgba(0,0,0,0.88)",
            outerGlow,
          ]
            .filter(Boolean)
            .join(", "),
        }}
      >
        {/* ── Liquid fill ─────────────────────────────────────────────── */}
        <motion.div
          initial={{ width: "0%" }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            height: "100%",
            overflow: "hidden", // clips shimmer & glow to fill area
            background:
              "linear-gradient(180deg, #ff5c7a 0%, #df1842 28%, #bc0030 62%, #940022 100%)",
          }}
        >
          {/* Top specular highlight — the main 3-D "gloss" */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "47%",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.54) 0%, rgba(255,255,255,0.18) 55%, transparent 100%)",
            }}
          />

          {/* Bottom depth shadow */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "22%",
              background:
                "linear-gradient(0deg, rgba(0,0,0,0.40) 0%, transparent 100%)",
            }}
          />

          {/* Right-edge glow — bright "meniscus" at the liquid boundary */}
          <div
            style={{
              position: "absolute",
              top: "8%",
              right: 0,
              bottom: "8%",
              width: r * 1.4,
              background:
                "radial-gradient(ellipse at right center, rgba(255,130,160,0.55) 0%, transparent 70%)",
            }}
          />

          {/* Travelling shimmer stripe */}
          <motion.div
            animate={{ x: ["-140%", "560%"] }}
            transition={{
              duration: 2.4,
              ease: "easeInOut",
              repeat: Infinity,
              repeatDelay: 1.4,
            }}
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 0,
              width: "20%",
              transform: "skewX(-12deg)",
              background:
                "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.26) 50%, transparent 100%)",
            }}
          />
        </motion.div>

        {/* ── Glass sheen overlay (covers full capsule) ────────────────── */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.01) 48%, transparent 100%)",
          }}
        />

        {/* ── Capsule rim (border + inner highlight line) ──────────────── */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            borderRadius: r,
            border: "1px solid rgba(255,255,255,0.13)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22)",
          }}
        />
      </div>

      {/* ── Animated percentage counter ──────────────────────────────────── */}
      {showPercent && (
        <span
          style={{
            fontSize: 32,
            fontWeight: 600,
            letterSpacing: "0.06em",
            color: "#d41e50",
            lineHeight: 1,
            fontFamily: "inherit",
          }}
        >
          {count}%
        </span>
      )}

      {/* ── Loading label ─────────────────────────────────────────────────── */}
      {label != null && (
        <span
          style={{
            fontSize: 11,
            fontWeight: 300,
            letterSpacing: "0.34em",
            color: "#888888",
            textTransform: "uppercase",
            fontFamily: "inherit",
          }}
        >
          {label}
        </span>
      )}
    </div>
  );
}
