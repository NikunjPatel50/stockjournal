import { format } from "date-fns";
import type { AdminUserRow } from "@/lib/admin-data";

export function AdminUsersTable({ rows }: { rows: AdminUserRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border/80 bg-muted/15 px-4 py-10 text-center text-sm text-muted-foreground">
        No user settings rows yet. Users appear here after they sync journal or
        goals to the cloud.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/60 shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[52rem] text-left text-sm">
          <thead className="border-b border-border/60 bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Currency</th>
              <th className="px-4 py-3 font-medium">Trades synced</th>
              <th className="px-4 py-3 font-medium">Goals</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3 font-medium">Last journal sync</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {rows.map((row) => (
              <tr key={row.userId} className="align-top hover:bg-muted/20">
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground">{row.fullName}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.email ?? row.userId.slice(0, 8) + "…"}
                  </p>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {row.currency}
                </td>
                <td className="px-4 py-3 font-medium text-foreground">
                  {row.tradeCount}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {row.goalCount}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                  {format(new Date(row.createdAt), "MMM d, yyyy")}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                  {row.lastTradeSync
                    ? format(new Date(row.lastTradeSync), "MMM d, yyyy · h:mm a")
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-border/50 px-4 py-2 text-xs text-muted-foreground">
        {rows.length} user{rows.length === 1 ? "" : "s"} with cloud settings
      </div>
    </div>
  );
}
