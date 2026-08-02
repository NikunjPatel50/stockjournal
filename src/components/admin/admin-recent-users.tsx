import Link from "next/link";
import { formatDistanceToNowStrict } from "date-fns";
import { ArrowRight } from "lucide-react";
import { DataPanel, PanelEmpty } from "@/components/data-panel";
import type { AdminUserRow } from "@/lib/admin-data";
import { cn, NUMERIC_CLASS } from "@/lib/utils";

/** Green within a week, amber within a month, muted beyond that. */
function freshnessClass(lastSync: string | null): string {
  if (!lastSync) return "bg-muted-foreground/40";
  const ageDays = (Date.now() - new Date(lastSync).getTime()) / 86_400_000;
  if (ageDays <= 7) return "bg-emerald-500";
  if (ageDays <= 30) return "bg-amber-500";
  return "bg-muted-foreground/40";
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

export function AdminRecentUsers({
  rows,
  total,
}: {
  rows: AdminUserRow[];
  total: number;
}) {
  return (
    <DataPanel
      title="Recently synced users"
      subtitle="Ordered by the last journal write to the cloud"
      action={
        <Link
          href="/admin/users"
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border/70 bg-muted/30 px-2 py-1 text-[11px] font-medium text-foreground transition-colors hover:bg-muted/60"
        >
          All users
          <ArrowRight className="size-3" />
        </Link>
      }
      flush={rows.length > 0}
      footer={
        rows.length > 0 && total > rows.length
          ? `Showing ${rows.length} of ${total} cloud-synced accounts.`
          : undefined
      }
    >
      {rows.length === 0 ? (
        <PanelEmpty
          title="No cloud accounts yet"
          hint="Users appear once they sync a journal or goal to the cloud."
        />
      ) : (
        <ul className="divide-y divide-border/60">
          {rows.map((row) => (
            <li
              key={row.userId}
              className="flex items-center gap-3 px-4 py-3 sm:px-5"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border/70 bg-muted/40 text-[11px] font-semibold text-muted-foreground">
                {initials(row.fullName)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-foreground">
                  {row.fullName}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {row.email ?? `${row.userId.slice(0, 8)}…`}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className={cn("text-xs font-semibold", NUMERIC_CLASS)}>
                  {row.tradeCount}
                  <span className="ml-1 font-normal text-muted-foreground">
                    trades
                  </span>
                </p>
                <p className="mt-0.5 flex items-center justify-end gap-1.5 text-[11px] text-muted-foreground">
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      freshnessClass(row.lastTradeSync)
                    )}
                    aria-hidden
                  />
                  {row.lastTradeSync
                    ? formatDistanceToNowStrict(new Date(row.lastTradeSync), {
                        addSuffix: true,
                      })
                    : "never synced"}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </DataPanel>
  );
}
