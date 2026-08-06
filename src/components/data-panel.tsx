import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type DataPanelProps = {
  title: string;
  subtitle?: string;
  /** Right-aligned sample size or period context, e.g. "24 trades". */
  meta?: ReactNode;
  /** Replaces the meta slot with interactive controls. */
  action?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  /** Removes body padding so tables can bleed to the panel edge. */
  flush?: boolean;
};

/** Shared surface for analytics and admin read-outs. */
export function DataPanel({
  title,
  subtitle,
  meta,
  action,
  footer,
  children,
  className,
  bodyClassName,
  flush = false,
}: DataPanelProps) {
  return (
    <section
      className={cn(
        "flex min-w-0 flex-col overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm",
        "ring-1 ring-foreground/[0.04] dark:ring-foreground/[0.06]",
        className
      )}
    >
      <header className="flex flex-col gap-3 border-b border-border/70 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:px-5">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold tracking-tight text-foreground">
            {title}
          </h3>
          {subtitle ? (
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              {subtitle}
            </p>
          ) : null}
        </div>
        {action ?? (meta ? <PanelMeta>{meta}</PanelMeta> : null) ? (
          <div className="w-full min-w-0 shrink sm:w-auto">
            {action ?? (meta ? <PanelMeta>{meta}</PanelMeta> : null)}
          </div>
        ) : null}
      </header>

      <div className={cn("min-w-0 flex-1", !flush && "p-4 sm:p-5", bodyClassName)}>
        {children}
      </div>

      {footer ? (
        <footer className="border-t border-border/70 bg-muted/20 px-4 py-2.5 text-[11px] leading-relaxed text-muted-foreground sm:px-5">
          {footer}
        </footer>
      ) : null}
    </section>
  );
}

export function PanelMeta({ children }: { children: ReactNode }) {
  return (
    <span className="shrink-0 whitespace-nowrap rounded-md border border-border/70 bg-muted/40 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
      {children}
    </span>
  );
}

type PanelEmptyProps = {
  /** What is missing, e.g. "No closed trades in this period". */
  title: string;
  /** What the reader can do to populate the panel. */
  hint?: string;
  className?: string;
};

/** Consistent "not enough data" state used across every panel. */
export function PanelEmpty({ title, hint, className }: PanelEmptyProps) {
  return (
    <div
      className={cn(
        "flex min-h-[8rem] flex-col items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/15 px-4 py-8 text-center",
        className
      )}
    >
      <p className="text-sm font-medium text-foreground">{title}</p>
      {hint ? (
        <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
