"use client";

import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export function ScreenerToolbar({
  query,
  onQueryChange,
  view,
  onViewChange,
  searchPlaceholder,
  extra,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  view: "table" | "heatmap";
  onViewChange: (view: "table" | "heatmap") => void;
  searchPlaceholder: string;
  extra?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Input
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder={searchPlaceholder}
        className="h-9 max-w-xs"
      />
      <div className="flex flex-wrap items-center gap-2">
        {extra}
        <Tabs
          value={view}
          onValueChange={(value) => {
            if (value === "table" || value === "heatmap") {
              onViewChange(value);
            }
          }}
        >
          <TabsList className={cn("h-9")}>
            <TabsTrigger value="table" className="px-3 text-xs">
              Table
            </TabsTrigger>
            <TabsTrigger value="heatmap" className="px-3 text-xs">
              Heatmap
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
}
