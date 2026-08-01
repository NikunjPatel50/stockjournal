import { AppPageHeader } from "@/components/app-page-header";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminUsersTable } from "@/components/admin/admin-users-table";
import { APP_PAGE_SHELL_CLASS } from "@/lib/app-shell";
import { fetchAdminUsers, type AdminUserRow } from "@/lib/admin-data";

export default async function AdminUsersPage() {
  let rows: AdminUserRow[] = [];
  let error: string | null = null;

  try {
    rows = await fetchAdminUsers();
  } catch (err) {
    error = err instanceof Error ? err.message : "Could not load users.";
    rows = [];
  }

  return (
    <div className={APP_PAGE_SHELL_CLASS}>
      <AppPageHeader
        eyebrow="Admin"
        title="Users"
        description="Cloud-synced profiles, journal trade counts, and goal activity."
      />

      <AdminNav />

      {error ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-800 dark:text-rose-200">
          {error}
        </div>
      ) : null}

      <AdminUsersTable rows={rows} />
    </div>
  );
}
