"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { TableHead } from "@/components/ui/table";
import type { SortDirection } from "@/lib/screener/column-sort";
import { cn } from "@/lib/utils";

const HEAD =
  "h-9 bg-muted/30 px-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground";

export function ScreenerSortHead({
  label,
  active,
  direction,
  onClick,
  align = "left",
  title,
}: {
  label: string;
  active: boolean;
  direction: SortDirection;
  onClick: () => void;
  align?: "left" | "right";
  title?: string;
}) {
  return (
    <TableHead
      className={cn(HEAD, align === "right" && "text-right")}
      aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        title={title}
        onClick={onClick}
        aria-label={`Sort by ${label} ${
          active && direction === "desc" ? "ascending" : "descending"
        }`}
        className={cn(
          "inline-flex cursor-pointer items-center gap-0.5 whitespace-nowrap rounded-md px-1 py-0.5 transition-colors",
          align === "right" && "ml-auto",
          active ? "bg-primary/15 text-foreground" : "hover:text-foreground"
        )}
      >
        {label}
        {active ? (
          direction === "desc" ? (
            <ChevronDown className="size-3" />
          ) : (
            <ChevronUp className="size-3" />
          )
        ) : (
          <span className="flex flex-col -space-y-1.5 text-muted-foreground/50">
            <ChevronUp className="size-2.5" />
            <ChevronDown className="size-2.5" />
          </span>
        )}
      </button>
    </TableHead>
  );
}
