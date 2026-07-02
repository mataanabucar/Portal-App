"use client";

import { cn } from "@/lib/utils";

export type GennyBotState =
  | "idle"
  | "listening"
  | "thinking"
  | "responding"
  | "error";

const BOT_VIDEO_BY_STATE: Record<GennyBotState, string> = {
  idle: "/genny-bot/botdefaultestate.webm",
  listening: "/genny-bot/botListening.webm",
  thinking: "/genny-bot/botThinking.webm",
  responding: "/genny-bot/botReply.webm",
  error: "/genny-bot/botdefaultestate.webm",
};

interface GennyBotMascotProps {
  state: GennyBotState;
  size?: "floating" | "header";
  interactive?: boolean;
  className?: string;
}

export function GennyBotMascot({
  state,
  size = "floating",
  interactive = false,
  className,
}: GennyBotMascotProps) {
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
      <span className="genny-bot__video-shell">
        <video
          key={BOT_VIDEO_BY_STATE[state]}
          className="genny-bot__video"
          src={BOT_VIDEO_BY_STATE[state]}
          autoPlay
          loop
          muted
          playsInline
          preload={size === "header" ? "metadata" : "auto"}
          disablePictureInPicture
          draggable={false}
        />
      </span>
    </span>
  );
}
