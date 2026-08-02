import type { ReactNode } from "react";
import { cn, NUMERIC_DISPLAY_CLASS } from "@/lib/utils";

export type MetricTone = "positive" | "negative" | "neutral";

export type MetricBandItem = {
  label: string;
  value: string;
  detail?: string;
  tone?: MetricTone;
  /** Rendered under the detail line, e.g. inline links. */
  extra?: ReactNode;
};

function toneClass(tone: MetricTone) {
  if (tone === "positive") return "text-emerald-600 dark:text-emerald-400";
  if (tone === "negative") return "text-rose-600 dark:text-rose-400";
  return "text-foreground";
}

/**
 * Headline figures rendered as a single hairline-divided band. Cell dividers
 * come from the container background showing through a 1px grid gap, so they
 * stay clean at every breakpoint.
 */
export function MetricBand({
  items,
  columnsClassName = "sm:grid-cols-3 xl:grid-cols-6",
  className,
}: {
  items: MetricBandItem[];
  columnsClassName?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border/80 bg-border/70 shadow-sm",
        "ring-1 ring-foreground/[0.04] dark:ring-foreground/[0.06]",
        columnsClassName,
        className
      )}
    >
      {items.map((item) => (
        <div key={item.label} className="min-w-0 bg-card px-4 py-3.5 sm:px-5">
          <p className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {item.label}
          </p>
          <p
            className={cn(
              "mt-1.5 truncate text-xl font-semibold sm:text-[1.375rem]",
              NUMERIC_DISPLAY_CLASS,
              toneClass(item.tone ?? "neutral")
            )}
            title={item.value}
          >
            {item.value}
          </p>
          {item.detail ? (
            <p
              className="mt-1 truncate text-[11px] text-muted-foreground"
              title={item.detail}
            >
              {item.detail}
            </p>
          ) : null}
          {item.extra}
        </div>
      ))}
    </div>
  );
}
