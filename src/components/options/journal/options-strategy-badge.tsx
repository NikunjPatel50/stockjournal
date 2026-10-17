import type { OptionsStrategyCategory } from "@/lib/options-journal";
import { cn } from "@/lib/utils";

const STYLE: Record<
  OptionsStrategyCategory,
  { label: string; className: string; accent: string }
> = {
  all: { label: "All", className: "bg-muted text-muted-foreground", accent: "bg-muted-foreground" },
  vertical: {
    label: "Vertical",
    className:
      "border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300",
    accent: "bg-violet-500",
  },
  iron_condor: {
    label: "Iron Condor",
    className:
      "border-sky-500/25 bg-sky-500/10 text-sky-800 dark:text-sky-300",
    accent: "bg-sky-500",
  },
  iron_butterfly: {
    label: "Iron Fly",
    className:
      "border-indigo-500/25 bg-indigo-500/10 text-indigo-800 dark:text-indigo-300",
    accent: "bg-indigo-500",
  },
  calendar: {
    label: "Calendar",
    className:
      "border-amber-500/25 bg-amber-500/10 text-amber-900 dark:text-amber-200",
    accent: "bg-amber-500",
  },
  straddle_strangle: {
    label: "Volatility",
    className:
      "border-fuchsia-500/25 bg-fuchsia-500/10 text-fuchsia-800 dark:text-fuchsia-300",
    accent: "bg-fuchsia-500",
  },
  covered: {
    label: "Stock + Option",
    className:
      "border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
    accent: "bg-emerald-500",
  },
  single_leg: {
    label: "Single-leg",
    className:
      "border-border bg-muted/60 text-foreground",
    accent: "bg-muted-foreground",
  },
  other: {
    label: "Strategy",
    className: "border-border bg-muted/40 text-muted-foreground",
    accent: "bg-muted-foreground",
  },
};

export function strategyCategoryMeta(category: OptionsStrategyCategory) {
  return STYLE[category] ?? STYLE.other;
}

export function OptionsStrategyBadge({
  category,
  className,
}: {
  category: OptionsStrategyCategory;
  className?: string;
}) {
  const style = strategyCategoryMeta(category);
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center truncate rounded-md border px-2 py-0.5 text-[10px] font-semibold tracking-wide",
        style.className,
        className
      )}
    >
      {style.label}
    </span>
  );
}
