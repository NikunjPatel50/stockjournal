import { DataPanel } from "@/components/data-panel";
import { cn, NUMERIC_CLASS } from "@/lib/utils";

type Source = {
  table: string;
  rows: number;
  description: string;
};

export function AdminDataSources({ sources }: { sources: Source[] }) {
  return (
    <DataPanel
      title="Data sources"
      subtitle="Tables backing this console, read with the service role"
      meta={`${sources.length} tables`}
      flush
      footer="Counts are read live on each page load; there is no cached admin snapshot."
    >
      <ul className="divide-y divide-border/60">
        {sources.map((source) => (
          <li
            key={source.table}
            className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5"
          >
            <div className="min-w-0">
              <p className="truncate font-mono text-xs font-medium text-foreground">
                {source.table}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                {source.description}
              </p>
            </div>
            <p className={cn("shrink-0 text-sm font-semibold", NUMERIC_CLASS)}>
              {source.rows.toLocaleString("en-IN")}
              <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                rows
              </span>
            </p>
          </li>
        ))}
      </ul>
    </DataPanel>
  );
}
