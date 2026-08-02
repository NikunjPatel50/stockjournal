"use client";

import { useMemo, useState } from "react";
import { format, formatDistanceToNowStrict } from "date-fns";
import { Reply, Search } from "lucide-react";
import { FeedbackCategoryBadge } from "@/components/admin/feedback-category";
import { DataPanel, PanelEmpty } from "@/components/data-panel";
import { Input } from "@/components/ui/input";
import type { AdminFeedbackRow } from "@/lib/admin-data";
import { FEEDBACK_CATEGORIES } from "@/lib/feedback";
import { cn } from "@/lib/utils";

const ALL = "All";

export function AdminFeedbackTable({ rows }: { rows: AdminFeedbackRow[] }) {
  const [category, setCategory] = useState<string>(ALL);
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of rows) {
      map.set(row.category, (map.get(row.category) ?? 0) + 1);
    }
    return map;
  }, [rows]);

  const filters = useMemo(
    () => [
      { label: ALL, count: rows.length },
      ...FEEDBACK_CATEGORIES.map((name) => ({
        label: name as string,
        count: counts.get(name) ?? 0,
      })),
    ],
    [rows.length, counts]
  );

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (category !== ALL && row.category !== category) return false;
      if (!needle) return true;
      return [row.name, row.email, row.message]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [rows, category, query]);

  return (
    <DataPanel
      title="Feedback inbox"
      subtitle="Every submission from the in-app feedback form"
      action={
        <div className="relative w-44 shrink-0 sm:w-60">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search sender or message"
            aria-label="Search feedback"
            className="h-8 pl-8 text-xs"
          />
        </div>
      }
      flush
      footer={
        rows.length > 0
          ? `${visible.length} of ${rows.length} submission${rows.length === 1 ? "" : "s"} shown.`
          : undefined
      }
    >
      {rows.length === 0 ? (
        <div className="p-4 sm:p-5">
          <PanelEmpty
            title="No feedback submissions yet"
            hint="Messages sent through the in-app feedback form will land here."
          />
        </div>
      ) : (
        <>
          <div
            role="group"
            aria-label="Filter by category"
            className="flex flex-wrap gap-1.5 border-b border-border/60 px-4 py-2.5 sm:px-5"
          >
            {filters.map((filter) => {
              const active = category === filter.label;
              return (
                <button
                  key={filter.label}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setCategory(filter.label)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
                    active
                      ? "border-primary/30 bg-primary/15 text-primary"
                      : "border-border/70 bg-muted/25 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  {filter.label}
                  <span
                    className={cn(
                      "tabular-nums",
                      active ? "text-primary/80" : "text-muted-foreground/70"
                    )}
                  >
                    {filter.count}
                  </span>
                </button>
              );
            })}
          </div>

          {visible.length === 0 ? (
            <div className="p-4 sm:p-5">
              <PanelEmpty
                title="No matching submissions"
                hint="Adjust the category filter or clear the search to see more."
              />
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {visible.map((row) => {
                const submitted = new Date(row.createdAt);
                return (
                  <li key={row.id} className="px-4 py-4 sm:px-5">
                    <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <FeedbackCategoryBadge category={row.category} />
                        <span className="truncate text-xs font-medium text-foreground">
                          {row.name || "Unnamed"}
                        </span>
                        <a
                          href={`mailto:${row.email}?subject=${encodeURIComponent("Re: your SwingTradingLog feedback")}`}
                          className="inline-flex min-w-0 items-center gap-1 truncate text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                        >
                          <Reply className="size-3 shrink-0" aria-hidden />
                          <span className="truncate">{row.email}</span>
                        </a>
                      </div>
                      <time
                        dateTime={submitted.toISOString()}
                        title={format(submitted, "MMM d, yyyy · h:mm a")}
                        className="shrink-0 text-[11px] text-muted-foreground"
                      >
                        {formatDistanceToNowStrict(submitted, {
                          addSuffix: true,
                        })}
                      </time>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-relaxed text-muted-foreground">
                      {row.message}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </DataPanel>
  );
}
