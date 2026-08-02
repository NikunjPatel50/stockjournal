import { DataPanel, PanelEmpty } from "@/components/data-panel";
import { feedbackCategoryDot } from "@/components/admin/feedback-category";
import { FEEDBACK_CATEGORIES } from "@/lib/feedback";
import { cn, NUMERIC_CLASS } from "@/lib/utils";

export function AdminCategoryBreakdown({
  counts,
  total,
}: {
  counts: Record<string, number>;
  total: number;
}) {
  const rows = FEEDBACK_CATEGORIES.map((category) => ({
    category,
    count: counts[category] ?? 0,
  }));
  const unknown = Object.entries(counts)
    .filter(([category]) => !FEEDBACK_CATEGORIES.includes(category as never))
    .map(([category, count]) => ({ category, count }));
  const all = [...rows, ...unknown];
  const max = Math.max(1, ...all.map((row) => row.count));

  return (
    <DataPanel
      title="Feedback by category"
      subtitle="Distribution across all submissions received"
      meta={`${total} total`}
    >
      {total === 0 ? (
        <PanelEmpty
          title="No feedback yet"
          hint="Submissions from the in-app feedback form appear here."
        />
      ) : (
        <ul className="space-y-3">
          {all.map((row) => {
            const share = total ? (row.count / total) * 100 : 0;
            return (
              <li key={row.category}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className={cn(
                        "size-1.5 shrink-0 rounded-full",
                        feedbackCategoryDot(row.category)
                      )}
                      aria-hidden
                    />
                    <span className="truncate text-xs font-medium text-foreground">
                      {row.category}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "shrink-0 text-xs text-muted-foreground",
                      NUMERIC_CLASS
                    )}
                  >
                    <span className="font-semibold text-foreground">
                      {row.count}
                    </span>{" "}
                    · {share.toFixed(0)}%
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-foreground/35"
                    style={{ width: `${(row.count / max) * 100}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </DataPanel>
  );
}
