import { AdminFeedbackTable } from "@/components/admin/admin-feedback-table";
import { AdminShell } from "@/components/admin/admin-shell";
import { MetricBand } from "@/components/metric-band";
import { fetchAdminFeedback, type AdminFeedbackRow } from "@/lib/admin-data";

const FEEDBACK_LIMIT = 150;
const WEEK_MS = 7 * 86_400_000;

export default async function AdminFeedbackPage() {
  let rows: AdminFeedbackRow[] = [];
  let error: string | null = null;

  try {
    rows = await fetchAdminFeedback(FEEDBACK_LIMIT);
  } catch (err) {
    error =
      err instanceof Error
        ? err.message
        : "Could not load feedback submissions.";
  }

  const thisWeek = rows.filter(
    (row) => Date.now() - new Date(row.createdAt).getTime() <= WEEK_MS
  ).length;
  const bugs = rows.filter((row) => row.category === "Bug report").length;
  const requests = rows.filter(
    (row) => row.category === "Feature request"
  ).length;
  const uniqueSenders = new Set(rows.map((row) => row.userId)).size;

  return (
    <AdminShell
      title="Feedback"
      description="Product feedback submitted by authenticated users."
      generatedAt={new Date()}
      error={error}
    >
      <MetricBand
        columnsClassName="sm:grid-cols-3 xl:grid-cols-5"
        items={[
          {
            label: "Submissions",
            value: rows.length.toLocaleString("en-IN"),
            detail: `Newest ${FEEDBACK_LIMIT} loaded`,
          },
          {
            label: "Last 7 days",
            value: thisWeek.toLocaleString("en-IN"),
            detail: "Recent submission volume",
            tone: thisWeek > 0 ? "positive" : "neutral",
          },
          {
            label: "Bug reports",
            value: bugs.toLocaleString("en-IN"),
            detail: "Needs triage first",
            tone: bugs > 0 ? "negative" : "neutral",
          },
          {
            label: "Feature requests",
            value: requests.toLocaleString("en-IN"),
            detail: "Candidates for the roadmap",
          },
          {
            label: "Unique senders",
            value: uniqueSenders.toLocaleString("en-IN"),
            detail: "Distinct accounts",
          },
        ]}
      />

      <AdminFeedbackTable rows={rows} />
    </AdminShell>
  );
}
