"use client";

import type { ReactNode } from "react";
import { HeaderActions } from "@/components/header-actions";
import { useIsMobile } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

type AppPageHeaderProps = {
  eyebrow?: string;
  /** When true (default), eyebrow uses small caps overline style. */
  overlineEyebrow?: boolean;
  title: string;
  description?: string;
  /** Page-level actions (e.g. primary CTA) shown before global header actions. */
  pageActions?: ReactNode;
  className?: string;
  actionsClassName?: string;
};

/** Consistent app shell header. */
export function AppPageHeader({
  eyebrow,
  overlineEyebrow = true,
  title,
  description,
  pageActions,
  className,
  actionsClassName,
}: AppPageHeaderProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className={cn("space-y-3 border-b border-border/60 pb-3", className)}>
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            {eyebrow ? (
              <p
                className={cn(
                  "text-[10px] font-medium text-muted-foreground",
                  overlineEyebrow && "uppercase tracking-wider"
                )}
              >
                {eyebrow}
              </p>
            ) : null}
            <h1
              className={cn(
                "truncate font-semibold tracking-tight text-foreground",
                eyebrow ? "mt-0.5 text-lg" : "text-lg"
              )}
            >
              {title}
            </h1>
          </div>
          <HeaderActions
            compact
            className={cn("shrink-0 flex-nowrap", actionsClassName)}
          />
        </div>
        {pageActions ? (
          <div className="flex w-full items-center gap-2">{pageActions}</div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4",
        className
      )}
    >
      <div className={cn("min-w-0 pr-1", "lg:pr-0")}>
        {eyebrow ? (
          <p
            className={cn(
              "text-xs font-medium text-muted-foreground",
              overlineEyebrow && "uppercase tracking-wider"
            )}
          >
            {eyebrow}
          </p>
        ) : null}
        <h1
          className={cn(
            "font-semibold tracking-tight text-foreground",
            eyebrow ? "mt-1 text-xl sm:text-2xl" : "text-2xl"
          )}
        >
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {pageActions}
        <HeaderActions
          className={cn(
            "w-full max-w-full shrink-0 justify-end self-stretch sm:w-auto sm:self-auto",
            actionsClassName
          )}
        />
      </div>
    </div>
  );
}
