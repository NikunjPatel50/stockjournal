import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Column-aligned currency and P&L (sans, tabular lining figures). */
export const NUMERIC_CLASS =
  "font-sans tabular-nums tracking-tight [font-feature-settings:'tnum'_1,'lnum'_1]";

/** Headline KPIs and summary stats — same figure style as {@link NUMERIC_CLASS}. */
export const NUMERIC_DISPLAY_CLASS =
  "font-sans tabular-nums tracking-tight [font-feature-settings:'tnum'_1,'lnum'_1]";

/** High-contrast status badges (light + dark). Use with Badge variant="outline". */
export const tradeBadgePositive =
  "border-emerald-500/35 bg-emerald-500/15 text-emerald-900 hover:bg-emerald-500/15 dark:text-emerald-300"
export const tradeBadgeNegative =
  "border-rose-500/35 bg-rose-500/15 text-rose-900 hover:bg-rose-500/15 dark:text-rose-300"
export const tradeBadgeNeutral =
  "border-zinc-500/35 bg-zinc-500/15 text-zinc-800 hover:bg-zinc-500/15 dark:text-zinc-300"
export const tradeBadgeActive =
  "border-sky-500/35 bg-sky-500/15 text-sky-900 hover:bg-sky-500/15 dark:text-sky-300"
