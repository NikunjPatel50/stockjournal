import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { AdminNav } from "@/components/admin/admin-nav";
import { AppPageHeader } from "@/components/app-page-header";
import { APP_PAGE_SHELL_CLASS } from "@/lib/app-shell";

type AdminShellProps = {
  title: string;
  description: string;
  /** Read at request time so operators can tell how fresh the numbers are. */
  generatedAt: Date;
  error?: string | null;
  children: ReactNode;
};

/** Consistent chrome for every admin route: header, tabs, freshness, errors. */
export function AdminShell({
  title,
  description,
  generatedAt,
  error,
  children,
}: AdminShellProps) {
  return (
    <div className={APP_PAGE_SHELL_CLASS}>
      <AppPageHeader eyebrow="Admin" title={title} description={description} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <AdminNav />
        <p className="text-[11px] text-muted-foreground">
          Live query ·{" "}
          <time dateTime={generatedAt.toISOString()}>
            {generatedAt.toLocaleString("en-IN", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </time>
        </p>
      </div>

      {error ? <AdminErrorNotice message={error} /> : null}

      {children}
    </div>
  );
}

export function AdminErrorNotice({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3"
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-rose-600 dark:text-rose-400" />
      <div className="min-w-0">
        <p className="text-sm font-medium text-rose-900 dark:text-rose-200">
          Query failed
        </p>
        <p className="mt-0.5 break-words text-xs text-rose-800/90 dark:text-rose-300/90">
          {message}
        </p>
      </div>
    </div>
  );
}
