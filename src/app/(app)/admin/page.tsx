import Link from "next/link";
import { AppPageHeader } from "@/components/app-page-header";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { APP_PAGE_SHELL_CLASS } from "@/lib/app-shell";
import { fetchAdminDashboardStats } from "@/lib/admin-data";

export default async function AdminOverviewPage() {
  let stats;
  let error: string | null = null;
  try {
    stats = await fetchAdminDashboardStats();
  } catch (err) {
    error =
      err instanceof Error ? err.message : "Could not load admin statistics.";
  }

  return (
    <div className={APP_PAGE_SHELL_CLASS}>
      <AppPageHeader
        eyebrow="Admin"
        title="Overview"
        description="Monitor users, feedback, and cloud-sync activity for Swing Trading Log."
      />

      <AdminNav />

      {error ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-800 dark:text-rose-200">
          {error}
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <AdminStatCard
              label="Users with cloud data"
              value={stats.usersWithSettings}
              hint="Rows in user_settings"
            />
            <AdminStatCard
              label="Trades synced"
              value={stats.totalTradesSynced}
              hint="Across all journal backups"
            />
            <AdminStatCard
              label="Active sync (7d)"
              value={stats.activeSyncUsers7d}
              hint="Users who synced journal in the last week"
            />
            <AdminStatCard
              label="Goals in cloud"
              value={stats.totalGoals}
              hint="Total goal rows"
            />
            <AdminStatCard
              label="Feedback total"
              value={stats.feedbackTotal}
              hint={`${stats.feedbackThisWeek} this week`}
            />
            <AdminStatCard
              label="Quick links"
              value="→"
              hint="Manage feedback and users"
            >
              <div className="mt-3 flex flex-wrap gap-2 text-sm">
                <Link
                  href="/admin/feedback"
                  className="rounded-lg border border-border/70 px-2.5 py-1 hover:bg-muted/40"
                >
                  Feedback inbox
                </Link>
                <Link
                  href="/admin/users"
                  className="rounded-lg border border-border/70 px-2.5 py-1 hover:bg-muted/40"
                >
                  User explorer
                </Link>
              </div>
            </AdminStatCard>
          </div>

          {Object.keys(stats.categoryCounts).length > 0 ? (
            <section className="rounded-2xl border border-border/70 bg-card/60 p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-foreground">
                Feedback by category
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {Object.entries(stats.categoryCounts).map(([category, count]) => (
                  <span
                    key={category}
                    className="rounded-full border border-border/70 bg-muted/30 px-3 py-1 text-xs font-medium text-foreground"
                  >
                    {category}: {count}
                  </span>
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
