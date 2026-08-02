"use client";

import type { ReactNode } from "react";
import { cn, NUMERIC_CLASS } from "@/lib/utils";

type ReportSectionProps = {
  /** Two-digit section index rendered as a report marker, e.g. "02". */
  index: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function ReportSection({
  index,
  title,
  description,
  children,
  className,
}: ReportSectionProps) {
  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "text-[11px] font-semibold text-muted-foreground/70",
            NUMERIC_CLASS
          )}
        >
          {index}
        </span>
        <div className="min-w-0">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground">
            {title}
          </h2>
        </div>
        <span className="h-px flex-1 bg-border/70" aria-hidden />
        {description ? (
          <p className="hidden max-w-md truncate text-xs text-muted-foreground lg:block">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
