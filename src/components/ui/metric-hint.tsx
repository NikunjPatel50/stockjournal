"use client";

import {
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
} from "react";
import { createPortal } from "react-dom";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

const TOOLTIP_MAX_WIDTH = 264;
const VIEWPORT_PADDING = 16;
const GAP_PX = 6;

function normalizeHintText(hint: string) {
  return hint.replace(/\s*—\s*/g, ", ");
}

type MetricHintProps = {
  title: string;
  hint: string;
  size?: "sm" | "md";
};

export function MetricHint({ title, hint, size = "sm" }: MetricHintProps) {
  const hintText = normalizeHintText(hint);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: TOOLTIP_MAX_WIDTH });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipId = useId();

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const width = Math.min(
      TOOLTIP_MAX_WIDTH,
      window.innerWidth - VIEWPORT_PADDING * 2
    );
    const centerX = rect.left + rect.width / 2;
    let left = centerX - width / 2;
    left = Math.max(
      VIEWPORT_PADDING,
      Math.min(left, window.innerWidth - width - VIEWPORT_PADDING)
    );

    setCoords({
      top: rect.top - GAP_PX,
      left,
      width,
    });
  }, []);

  const show = useCallback(() => {
    updatePosition();
    setOpen(true);
  }, [updatePosition]);

  const hide = useCallback(() => {
    setOpen(false);
  }, []);

  function handleBlur(event: FocusEvent<HTMLSpanElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      hide();
    }
  }

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, updatePosition]);

  const buttonSize = size === "md" ? "size-5" : "size-4";
  const iconSize = size === "md" ? "size-3.5" : "size-3";

  return (
    <>
      <span
        className="relative inline-flex align-middle"
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={handleBlur}
      >
        <button
          ref={triggerRef}
          type="button"
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded-full text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
            buttonSize
          )}
          aria-label={`About ${title}`}
          aria-describedby={open ? tooltipId : undefined}
        >
          <Info className={iconSize} strokeWidth={2} aria-hidden />
        </button>
      </span>
      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              id={tooltipId}
              role="tooltip"
              style={{
                position: "fixed",
                top: coords.top,
                left: coords.left,
                width: coords.width,
                transform: "translateY(-100%)",
              }}
              className={cn(
                "z-[200] rounded-lg border border-border/80 bg-popover p-3 text-popover-foreground shadow-lg ring-1 ring-foreground/10",
                "pointer-events-none animate-in fade-in-0 zoom-in-95 duration-150"
              )}
            >
              <span className="block text-xs font-semibold leading-snug text-foreground">
                {title}
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                {hintText}
              </span>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
