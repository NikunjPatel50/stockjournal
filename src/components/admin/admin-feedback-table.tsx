import { format } from "date-fns";
import { FEEDBACK_CATEGORIES } from "@/lib/feedback";
import type { AdminFeedbackRow } from "@/lib/admin-data";
import { cn } from "@/lib/utils";

function categoryClass(category: string) {
  switch (category) {
    case "Bug report":
      return "bg-rose-500/10 text-rose-700 dark:text-rose-300";
    case "Feature request":
      return "bg-violet-500/10 text-violet-700 dark:text-violet-300";
    case "General":
      return "bg-sky-500/10 text-sky-700 dark:text-sky-300";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function AdminFeedbackTable({ rows }: { rows: AdminFeedbackRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border/80 bg-muted/15 px-4 py-10 text-center text-sm text-muted-foreground">
        No feedback submissions yet.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/60 shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[48rem] text-left text-sm">
          <thead className="border-b border-border/60 bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">From</th>
              <th className="px-4 py-3 font-medium">Message</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {rows.map((row) => (
              <tr key={row.id} className="align-top hover:bg-muted/20">
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                  {format(new Date(row.createdAt), "MMM d, yyyy · h:mm a")}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium",
                      categoryClass(row.category)
                    )}
                  >
                    {row.category}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground">
                    {row.name || "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">{row.email}</p>
                </td>
                <td className="max-w-md px-4 py-3 text-muted-foreground">
                  <p className="whitespace-pre-wrap break-words">{row.message}</p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-border/50 px-4 py-2 text-xs text-muted-foreground">
        Showing {rows.length} submission{rows.length === 1 ? "" : "s"} ·{" "}
        {FEEDBACK_CATEGORIES.join(", ")}
      </div>
    </div>
  );
}
