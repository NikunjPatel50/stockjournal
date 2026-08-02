import { AdminShell } from "@/components/admin/admin-shell";
import { AdminUsersTable } from "@/components/admin/admin-users-table";
import { MetricBand } from "@/components/metric-band";
import { fetchAdminUsers, type AdminUserRow } from "@/lib/admin-data";

const WEEK_MS = 7 * 86_400_000;

export default async function AdminUsersPage() {
  let rows: AdminUserRow[] = [];
  let error: string | null = null;

  try {
    rows = await fetchAdminUsers();
  } catch (err) {
    error = err instanceof Error ? err.message : "Could not load users.";
  }

  const totalTrades = rows.reduce((sum, row) => sum + row.tradeCount, 0);
  const totalGoals = rows.reduce((sum, row) => sum + row.goalCount, 0);
  const activeThisWeek = rows.filter(
    (row) =>
      row.lastTradeSync != null &&
      Date.now() - new Date(row.lastTradeSync).getTime() <= WEEK_MS
  ).length;
  const neverSynced = rows.filter((row) => row.lastTradeSync == null).length;

  return (
    <AdminShell
      title="Users"
      description="Cloud-synced profiles, journal volume, and sync recency."
      generatedAt={new Date()}
      error={error}
    >
      <MetricBand
        columnsClassName="sm:grid-cols-3 xl:grid-cols-5"
        items={[
          {
            label: "Cloud accounts",
            value: rows.length.toLocaleString("en-IN"),
            detail: "Rows in user_settings",
          },
          {
            label: "Active this week",
            value: activeThisWeek.toLocaleString("en-IN"),
            detail: "Journal written in last 7 days",
            tone: activeThisWeek > 0 ? "positive" : "neutral",
          },
          {
            label: "Never synced",
            value: neverSynced.toLocaleString("en-IN"),
            detail: "Settings row without journal data",
            tone: neverSynced > 0 ? "negative" : "neutral",
          },
          {
            label: "Trades stored",
            value: totalTrades.toLocaleString("en-IN"),
            detail: `${rows.length ? (totalTrades / rows.length).toFixed(1) : "0.0"} average per account`,
          },
          {
            label: "Goals stored",
            value: totalGoals.toLocaleString("en-IN"),
            detail: "Across all accounts",
          },
        ]}
      />

      <AdminUsersTable rows={rows} />
    </AdminShell>
  );
}
