import { AdminCategoryBreakdown } from "@/components/admin/admin-category-breakdown";
import { AdminDataSources } from "@/components/admin/admin-data-sources";
import { AdminRecentFeedback } from "@/components/admin/admin-recent-feedback";
import { AdminRecentUsers } from "@/components/admin/admin-recent-users";
import { AdminShell } from "@/components/admin/admin-shell";
import { MetricBand } from "@/components/metric-band";
import {
  fetchAdminDashboardStats,
  fetchAdminFeedback,
  fetchAdminUsers,
  type AdminDashboardStats,
  type AdminFeedbackRow,
  type AdminUserRow,
} from "@/lib/admin-data";

const RECENT_LIMIT = 5;

function sortByLastSync(rows: AdminUserRow[]): AdminUserRow[] {
  return [...rows].sort((a, b) => {
    const left = a.lastTradeSync ?? a.createdAt;
    const right = b.lastTradeSync ?? b.createdAt;
    return right.localeCompare(left);
  });
}

export default async function AdminOverviewPage() {
  let stats: AdminDashboardStats | null = null;
  let feedback: AdminFeedbackRow[] = [];
  let users: AdminUserRow[] = [];
  let error: string | null = null;

  try {
    [stats, feedback, users] = await Promise.all([
      fetchAdminDashboardStats(),
      fetchAdminFeedback(RECENT_LIMIT),
      fetchAdminUsers(),
    ]);
  } catch (err) {
    error =
      err instanceof Error ? err.message : "Could not load admin statistics.";
  }

  const activeShare =
    stats && stats.usersWithSettings > 0
      ? Math.round((stats.activeSyncUsers7d / stats.usersWithSettings) * 100)
      : 0;
  const avgTrades =
    stats && stats.usersWithSettings > 0
      ? stats.totalTradesSynced / stats.usersWithSettings
      : 0;

  return (
    <AdminShell
      title="Overview"
      description="Operational health of accounts, cloud sync, and product feedback."
      generatedAt={new Date()}
      error={error}
    >
      {stats ? (
        <>
          <MetricBand
            items={[
              {
                label: "Cloud accounts",
                value: stats.usersWithSettings.toLocaleString("en-IN"),
                detail: "Rows in user_settings",
              },
              {
                label: "Active sync (7d)",
                value: stats.activeSyncUsers7d.toLocaleString("en-IN"),
                detail: `${activeShare}% of all accounts`,
                tone: stats.activeSyncUsers7d > 0 ? "positive" : "neutral",
              },
              {
                label: "Trades synced",
                value: stats.totalTradesSynced.toLocaleString("en-IN"),
                detail: `${avgTrades.toFixed(1)} average per account`,
              },
              {
                label: "Goals stored",
                value: stats.totalGoals.toLocaleString("en-IN"),
                detail: "Rows in goals",
              },
              {
                label: "Feedback total",
                value: stats.feedbackTotal.toLocaleString("en-IN"),
                detail: "All time submissions",
              },
              {
                label: "Feedback this week",
                value: stats.feedbackThisWeek.toLocaleString("en-IN"),
                detail: "Since Monday",
                tone: stats.feedbackThisWeek > 0 ? "positive" : "neutral",
              },
            ]}
          />

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 xl:items-stretch">
            <AdminRecentFeedback rows={feedback} total={stats.feedbackTotal} />
            <AdminCategoryBreakdown
              counts={stats.categoryCounts}
              total={stats.feedbackTotal}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 xl:items-stretch">
            <AdminRecentUsers
              rows={sortByLastSync(users).slice(0, RECENT_LIMIT)}
              total={users.length}
            />
            <AdminDataSources
              sources={[
                {
                  table: "user_settings",
                  rows: stats.usersWithSettings,
                  description: "Profiles and journal trade backups",
                },
                {
                  table: "feedback_submissions",
                  rows: stats.feedbackTotal,
                  description: "In-app product feedback",
                },
                {
                  table: "goals",
                  rows: stats.totalGoals,
                  description: "Per-user trading goals",
                },
              ]}
            />
          </div>
        </>
      ) : null}
    </AdminShell>
  );
}
