import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type AdminStatCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  children?: ReactNode;
  className?: string;
};

export function AdminStatCard({
  label,
  value,
  hint,
  children,
  className,
}: AdminStatCardProps) {
  return (
    <article
      className={cn(
        "rounded-2xl border border-border/70 bg-card/60 p-4 shadow-sm",
        className
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
      {children}
    </article>
  );
}
