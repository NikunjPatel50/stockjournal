import type { ScreenerProgressCounts } from "@/hooks/use-screener-stream";

export function ScreenerLoadProgress({
  fetchingLabel,
  itemLabel,
  progress,
  counts,
}: {
  fetchingLabel: string;
  itemLabel: string;
  progress: number | null;
  counts: ScreenerProgressCounts | null;
}) {
  const percent = Math.min(100, Math.max(0, progress ?? 0));

  return (
    <div className="space-y-4">
      <div className="min-h-[14rem] animate-pulse rounded-xl bg-muted/40" />
      <div className="mx-auto max-w-sm space-y-2">
        <div className="flex items-center justify-between gap-3 text-xs font-medium text-muted-foreground">
          <span>
            {counts
              ? `Fetched ${counts.loaded} of ${counts.total} ${itemLabel}…`
              : fetchingLabel}
          </span>
          <span className="shrink-0 tabular-nums text-foreground">{percent}%</span>
        </div>
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-emerald-500 transition-[width] duration-500 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
