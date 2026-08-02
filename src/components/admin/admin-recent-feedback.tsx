import Link from "next/link";
import { formatDistanceToNowStrict } from "date-fns";
import { ArrowRight } from "lucide-react";
import { FeedbackCategoryBadge } from "@/components/admin/feedback-category";
import { DataPanel, PanelEmpty } from "@/components/data-panel";
import type { AdminFeedbackRow } from "@/lib/admin-data";

export function AdminRecentFeedback({
  rows,
  total,
}: {
  rows: AdminFeedbackRow[];
  total: number;
}) {
  return (
    <DataPanel
      title="Latest feedback"
      subtitle="Most recent submissions from authenticated users"
      action={
        <Link
          href="/admin/feedback"
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border/70 bg-muted/30 px-2 py-1 text-[11px] font-medium text-foreground transition-colors hover:bg-muted/60"
        >
          Open inbox
          <ArrowRight className="size-3" />
        </Link>
      }
      flush={rows.length > 0}
      footer={
        rows.length > 0 && total > rows.length
          ? `Showing the ${rows.length} newest of ${total} submissions.`
          : undefined
      }
    >
      {rows.length === 0 ? (
        <PanelEmpty
          title="Inbox is empty"
          hint="Nothing has been submitted through the feedback form yet."
        />
      ) : (
        <ul className="divide-y divide-border/60">
          {rows.map((row) => (
            <li key={row.id} className="px-4 py-3 sm:px-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <FeedbackCategoryBadge category={row.category} />
                  <span className="truncate text-xs font-medium text-foreground">
                    {row.name || row.email}
                  </span>
                </div>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {formatDistanceToNowStrict(new Date(row.createdAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>
              <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                {row.message}
              </p>
            </li>
          ))}
        </ul>
      )}
    </DataPanel>
  );
}
