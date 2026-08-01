import { AppPageHeader } from "@/components/app-page-header";
import { AdminFeedbackTable } from "@/components/admin/admin-feedback-table";
import { AdminNav } from "@/components/admin/admin-nav";
import { APP_PAGE_SHELL_CLASS } from "@/lib/app-shell";
import { fetchAdminFeedback, type AdminFeedbackRow } from "@/lib/admin-data";

export default async function AdminFeedbackPage() {
  let rows: AdminFeedbackRow[] = [];
  let error: string | null = null;

  try {
    rows = await fetchAdminFeedback(150);
  } catch (err) {
    error =
      err instanceof Error ? err.message : "Could not load feedback submissions.";
    rows = [];
  }

  return (
    <div className={APP_PAGE_SHELL_CLASS}>
      <AppPageHeader
        eyebrow="Admin"
        title="Feedback inbox"
        description="All product feedback submitted by authenticated users."
      />

      <AdminNav />

      {error ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-800 dark:text-rose-200">
          {error}
        </div>
      ) : null}

      <AdminFeedbackTable rows={rows} />
    </div>
  );
}
