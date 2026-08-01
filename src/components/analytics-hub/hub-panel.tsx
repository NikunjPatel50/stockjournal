"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type HubPanelProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  accent?: "default" | "violet" | "emerald" | "amber";
};

const accentRing: Record<NonNullable<HubPanelProps["accent"]>, string> = {
  default: "from-border/40 via-transparent to-transparent",
  violet: "from-violet-500/20 via-transparent to-transparent",
  emerald: "from-emerald-500/20 via-transparent to-transparent",
  amber: "from-amber-500/20 via-transparent to-transparent",
};

export function HubPanel({
  title,
  subtitle,
  action,
  children,
  className,
  accent = "default",
}: HubPanelProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/70 bg-card/60 shadow-sm backdrop-blur-sm",
        className
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r",
          accentRing[accent]
        )}
        aria-hidden
      />
      <div className="flex items-start justify-between gap-3 border-b border-border/50 px-4 py-3.5 sm:px-5">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              {subtitle}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}
