"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SettingsPanel({ children, className }: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-h-[min(32rem,70vh)] flex-col bg-card", className)}>
      {children}
    </div>
  );
}

export function SettingsPanelHero({
  initials,
  title,
  subtitle,
}: {
  initials: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="relative border-b border-border px-6 py-6 sm:px-8">
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-muted/80 via-card to-card"
        aria-hidden
      />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex size-16 shrink-0 items-center justify-center rounded-full border border-border bg-background text-lg font-semibold tracking-tight text-foreground shadow-sm">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold tracking-tight text-foreground">
            {title || "Your name"}
          </p>
          <p className="truncate text-sm text-muted-foreground">
            {subtitle || "Add a display title"}
          </p>
        </div>
      </div>
    </div>
  );
}

export function SettingsPanelIntro({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="border-b border-border px-6 py-5 sm:px-8">
      <h2 className="text-base font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export function SettingsSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("px-6 py-6 sm:px-8", className)}>
      <div className="mb-4 max-w-xl">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        {description ? (
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function SettingsPanelFooter({
  children,
  hint,
}: {
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="mt-auto flex flex-col gap-3 border-t border-border bg-muted/25 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
      {hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : (
        <span />
      )}
      <div className="flex shrink-0 justify-end gap-2">{children}</div>
    </div>
  );
}
