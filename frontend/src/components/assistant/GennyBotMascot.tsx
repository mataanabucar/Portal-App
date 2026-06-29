"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

export type GennyBotState =
  | "idle"
  | "listening"
  | "thinking"
  | "responding"
  | "error";

interface GennyBotMascotProps {
  state: GennyBotState;
  size?: "launcher" | "header";
  interactive?: boolean;
  className?: string;
}

export function GennyBotMascot({
  state,
  size = "launcher",
  interactive = false,
  className,
}: GennyBotMascotProps) {
  const uniqueId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const faceGradientId = `genny-face-${uniqueId}`;
  const bodyGradientId = `genny-body-${uniqueId}`;
  const glowGradientId = `genny-glow-${uniqueId}`;

  return (
    <span
      className={cn(
        "genny-bot",
        `genny-bot--${size}`,
        interactive && "genny-bot--interactive",
        className
      )}
      data-state={state}
      aria-hidden="true"
    >
      <svg
        className="genny-bot__svg"
        viewBox="0 0 160 160"
        role="img"
        focusable="false"
      >
        <defs>
          <radialGradient id={glowGradientId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.65" />
            <stop offset="54%" stopColor="#22c55e" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#020617" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={bodyGradientId} x1="34" x2="126" y1="26" y2="132">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="42%" stopColor="#eef8ff" />
            <stop offset="100%" stopColor="#bde7ff" />
          </linearGradient>
          <linearGradient id={faceGradientId} x1="49" x2="111" y1="48" y2="88">
            <stop offset="0%" stopColor="#172554" />
            <stop offset="58%" stopColor="#061826" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>
        </defs>

        <ellipse
          className="genny-bot__base-glow"
          cx="80"
          cy="136"
          rx="48"
          ry="13"
          fill={`url(#${glowGradientId})`}
        />

        <g className="genny-bot__bot">
          <g className="genny-bot__sparkles">
            <path
              className="genny-bot__sparkle genny-bot__sparkle--one"
              d="M127 28l4 8 8 4-8 4-4 8-4-8-8-4 8-4z"
            />
            <path
              className="genny-bot__sparkle genny-bot__sparkle--two"
              d="M28 52l3 6 6 3-6 3-3 6-3-6-6-3 6-3z"
            />
            <path
              className="genny-bot__sparkle genny-bot__sparkle--three"
              d="M134 93l2.5 5 5 2.5-5 2.5-2.5 5-2.5-5-5-2.5 5-2.5z"
            />
          </g>

          <g className="genny-bot__antenna">
            <path
              className="genny-bot__antenna-stem"
              d="M80 28V16"
              fill="none"
              stroke="#5eead4"
              strokeLinecap="round"
              strokeWidth="4"
            />
            <circle className="genny-bot__antenna-tip" cx="80" cy="12" r="5" />
          </g>

          <g className="genny-bot__ear genny-bot__ear--left">
            <rect x="24" y="58" width="17" height="34" rx="8" />
            <circle cx="32.5" cy="75" r="4" />
          </g>
          <g className="genny-bot__ear genny-bot__ear--right">
            <rect x="119" y="58" width="17" height="34" rx="8" />
            <circle cx="127.5" cy="75" r="4" />
          </g>

          <g className="genny-bot__head">
            <path
              className="genny-bot__head-shell"
              d="M43 43c0-11 9-20 20-20h34c11 0 20 9 20 20v39c0 13-10 23-23 23H66c-13 0-23-10-23-23z"
              fill={`url(#${bodyGradientId})`}
            />
            <path
              className="genny-bot__head-trim"
              d="M106 33c-4-7-11-11-20-11H63c-11 0-20 9-20 20v12c14-2 23-9 28-21 11 9 22 11 35 0z"
              fill="#38bdf8"
              opacity="0.9"
            />
            <rect
              className="genny-bot__face"
              x="51"
              y="51"
              width="58"
              height="37"
              rx="16"
              fill={`url(#${faceGradientId})`}
            />
            <rect
              className="genny-bot__face-shine"
              x="56"
              y="55"
              width="48"
              height="6"
              rx="3"
            />
            <rect
              className="genny-bot__eye genny-bot__eye--left"
              x="63"
              y="64"
              width="14"
              height="7"
              rx="3.5"
            />
            <rect
              className="genny-bot__eye genny-bot__eye--right"
              x="83"
              y="64"
              width="14"
              height="7"
              rx="3.5"
            />
            <path
              className="genny-bot__mouth"
              d="M68 78c6 7 18 7 24 0"
              fill="none"
              strokeLinecap="round"
              strokeWidth="4"
            />
          </g>

          <g className="genny-bot__body">
            <rect
              className="genny-bot__torso"
              x="52"
              y="97"
              width="56"
              height="38"
              rx="17"
              fill={`url(#${bodyGradientId})`}
            />
            <rect
              className="genny-bot__chest"
              x="64"
              y="107"
              width="32"
              height="18"
              rx="7"
            />
            <rect
              className="genny-bot__chest-bar genny-bot__chest-bar--one"
              x="69"
              y="112"
              width="21"
              height="3.5"
              rx="1.75"
            />
            <rect
              className="genny-bot__chest-bar genny-bot__chest-bar--two"
              x="69"
              y="119"
              width="14"
              height="3.5"
              rx="1.75"
            />
          </g>

          <g className="genny-bot__arm genny-bot__arm--left">
            <path
              d="M53 107c-12 2-20 8-23 20"
              fill="none"
              strokeLinecap="round"
              strokeWidth="9"
            />
            <circle cx="29" cy="130" r="7" />
          </g>
          <g className="genny-bot__arm genny-bot__wave-arm">
            <path
              d="M107 107c10-6 15-16 14-29"
              fill="none"
              strokeLinecap="round"
              strokeWidth="9"
            />
            <circle cx="122" cy="75" r="7" />
            <path
              className="genny-bot__wave-line genny-bot__wave-line--one"
              d="M132 63c5-5 8-11 8-18"
              fill="none"
              strokeLinecap="round"
              strokeWidth="3"
            />
            <path
              className="genny-bot__wave-line genny-bot__wave-line--two"
              d="M141 69c7-7 11-15 11-24"
              fill="none"
              strokeLinecap="round"
              strokeWidth="3"
            />
          </g>
        </g>
      </svg>
    </span>
  );
}
