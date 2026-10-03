import { AdminShell } from "@/components/admin/admin-shell";
import { AdminTradesTable } from "@/components/admin/admin-trades-table";
import { MetricBand } from "@/components/metric-band";
import { fetchAdminTrades, type AdminTradeRow } from "@/lib/admin-data";

export default async function AdminTradesPage({
  searchParams,
}: {
  searchParams: Promise<{ user?: string }>;
}) {
  const { user } = await searchParams;
  let rows: AdminTradeRow[] = [];
  let error: string | null = null;

  try {
    rows = await fetchAdminTrades();
  } catch (err) {
    error = err instanceof Error ? err.message : "Could not load trades.";
  }

  const accounts = new Set(rows.map((row) => row.userId)).size;
  const active = rows.filter((row) => row.status === "Active").length;
  const closed = rows.length - active;

  return (
    <AdminShell
      title="Trades"
      description="Every journal trade stored for every account."
      generatedAt={new Date()}
      error={error}
    >
      <MetricBand
        columnsClassName="sm:grid-cols-3"
        items={[
          {
            label: "Trades stored",
            value: rows.length.toLocaleString("en-IN"),
            detail: `${accounts.toLocaleString("en-IN")} account${accounts === 1 ? "" : "s"}`,
          },
          {
            label: "Open",
            value: active.toLocaleString("en-IN"),
            detail: "Status is Active",
            tone: active > 0 ? "positive" : "neutral",
          },
          {
            label: "Closed",
            value: closed.toLocaleString("en-IN"),
            detail: "Realized in the journal",
          },
        ]}
      />

      <AdminTradesTable rows={rows} initialUserId={user ?? ""} />
    </AdminShell>
  );
}
