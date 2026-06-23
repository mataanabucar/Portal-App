"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Check, ChevronDown, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectMenuOption {
  value: string;
  label: string;
}

interface SelectMenuProps {
  label: string;
  value: string;
  options: readonly SelectMenuOption[];
  onValueChange: (value: string) => void;
  disabled?: boolean;
  helperText?: string;
  className?: string;
}

export function SelectMenu({
  label,
  value,
  options,
  onValueChange,
  disabled = false,
  helperText,
  className,
}: SelectMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const listboxId = useId();
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value)
  );
  const [highlightedIndex, setHighlightedIndex] = useState(selectedIndex);
  const selectedOption = options[selectedIndex] ?? options[0];

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    listRef.current?.focus();
    optionRefs.current[highlightedIndex]?.scrollIntoView({
      block: "nearest",
    });
  }, [open, highlightedIndex]);

  const openMenu = (startIndex = selectedIndex) => {
    if (disabled) {
      return;
    }

    setHighlightedIndex(startIndex);
    setOpen(true);
  };

  const closeMenu = () => {
    setOpen(false);
  };

  const selectValue = (nextValue: string) => {
    if (nextValue !== value) {
      onValueChange(nextValue);
    }

    setOpen(false);
    triggerRef.current?.focus();
  };

  const moveHighlight = (direction: 1 | -1) => {
    const nextIndex =
      (highlightedIndex + direction + options.length) % options.length;
    setHighlightedIndex(nextIndex);
  };

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      openMenu(selectedIndex);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      openMenu(selectedIndex);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen((current) => !current);
    }

    if (event.key === "Escape") {
      closeMenu();
    }
  };

  const handleListKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveHighlight(1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveHighlight(-1);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      setHighlightedIndex(0);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      setHighlightedIndex(options.length - 1);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectValue(options[highlightedIndex]?.value ?? value);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
      triggerRef.current?.focus();
    }
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => {
          if (open) {
            closeMenu();
            return;
          }

          openMenu(selectedIndex);
        }}
        onKeyDown={handleTriggerKeyDown}
        disabled={disabled}
        className={cn(
          "group flex h-11 min-w-[280px] items-center gap-3 rounded-2xl border border-slate-600/80",
          "bg-[linear-gradient(180deg,rgba(11,19,35,0.96),rgba(8,14,27,0.92))] px-4 text-left",
          "shadow-[0_12px_28px_rgba(2,8,24,0.24)] transition",
          "hover:border-cyan-400/55 hover:bg-slate-900/90",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70",
          "disabled:cursor-not-allowed disabled:opacity-50"
        )}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-200">
          <SlidersHorizontal className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[0.63rem] font-extrabold uppercase tracking-[0.24em] text-slate-400">
            {label}
          </span>
          <span className="block truncate text-sm font-semibold tracking-tight text-slate-100">
            {selectedOption?.label ?? value}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200",
            open && "rotate-180 text-cyan-200"
          )}
        />
      </button>

      {open ? (
        <div
          className={cn(
            "absolute right-0 top-[calc(100%+0.65rem)] z-50 w-[min(22rem,calc(100vw-2.5rem))]",
            "overflow-hidden rounded-[20px] border border-slate-700/70",
            "bg-[linear-gradient(180deg,rgba(12,18,34,0.98),rgba(7,12,24,0.98))]",
            "p-2 shadow-[0_24px_72px_rgba(2,8,23,0.55)]"
          )}
        >
          <div className="border-b border-slate-800/80 px-3 pb-3 pt-2">
            <p className="text-[0.63rem] font-extrabold uppercase tracking-[0.24em] text-slate-500">
              {label}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              {helperText || "Choose an option."}
            </p>
          </div>

          <div
            id={listboxId}
            ref={listRef}
            role="listbox"
            tabIndex={-1}
            aria-label={label}
            onKeyDown={handleListKeyDown}
            className="mt-2 max-h-80 space-y-1 overflow-y-auto px-1 pb-1 outline-none"
          >
            {options.map((option, index) => {
              const isSelected = option.value === value;
              const isHighlighted = index === highlightedIndex;

              return (
                <button
                  key={option.value}
                  ref={(element) => {
                    optionRefs.current[index] = element;
                  }}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={() => selectValue(option.value)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition",
                    isSelected
                      ? "bg-cyan-500/18 text-slate-50 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.18)]"
                      : "text-slate-300",
                    isHighlighted && !isSelected && "bg-slate-800/85 text-slate-100",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                      isSelected
                        ? "border-cyan-300/60 bg-cyan-400/20 text-cyan-100"
                        : "border-slate-700/80 bg-slate-900/70 text-transparent"
                    )}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 text-sm font-medium leading-5">
                    {option.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
