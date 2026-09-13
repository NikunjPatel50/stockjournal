import { describeScreenerStrength } from "@/lib/screener/strength";
import { cn, NUMERIC_CLASS } from "@/lib/utils";

export function strengthToneClass(score: number | null | undefined): string {
  if (score == null || !Number.isFinite(score)) return "text-muted-foreground";
  if (score >= 65) return "text-emerald-600 dark:text-emerald-400";
  if (score <= 35) return "text-rose-600 dark:text-rose-400";
  return "text-muted-foreground";
}

export function ScreenerWhy({
  why,
}: {
  why?: string | null;
}) {
  if (!why) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <p
      title={why}
      className="max-w-[16rem] text-left text-[11px] leading-snug text-muted-foreground"
    >
      {why}
    </p>
  );
}

export function ScreenerStrength({
  score,
  compact = false,
}: {
  score: number | null | undefined;
  compact?: boolean;
}) {
  if (score == null || !Number.isFinite(score)) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <span className="inline-flex flex-col items-end leading-tight">
      <span className={cn(NUMERIC_CLASS, "font-medium", strengthToneClass(score))}>
        {score}
      </span>
      {compact ? null : (
        <span className="text-[10px] text-muted-foreground">
          {describeScreenerStrength(score)}
        </span>
      )}
    </span>
  );
}
