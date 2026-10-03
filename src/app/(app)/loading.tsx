import { APP_PAGE_SHELL_CLASS } from "@/lib/app-shell";

export default function AppLoading() {
  return (
    <div className={APP_PAGE_SHELL_CLASS} aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="space-y-2">
        <div className="h-6 w-40 animate-pulse rounded-md bg-muted/60" />
        <div className="h-3.5 w-64 animate-pulse rounded bg-muted/40" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-muted/40" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-xl bg-muted/35" />
    </div>
  );
}
