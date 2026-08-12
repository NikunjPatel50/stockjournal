"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { useJournalMarket } from "@/components/journal/journal-market-provider";
import type { JournalMarketRegionId } from "@/lib/journal-market-regions";
import { cn } from "@/lib/utils";

export function JournalMarketSelector({ className }: { className?: string }) {
  const {
    activeRegionId,
    activeRegion,
    availableRegions,
    setActiveRegionId,
    canSwitchRegion,
    hydrated,
  } = useJournalMarket();

  if (!hydrated) {
    return (
      <div
        aria-hidden
        className={cn(
          "h-9 w-[9.5rem] animate-pulse rounded-lg bg-muted",
          className
        )}
      />
    );
  }

  return (
    <Select
      value={activeRegionId}
      onValueChange={(value) => {
        if (value) setActiveRegionId(value as JournalMarketRegionId);
      }}
      disabled={!canSwitchRegion}
    >
      <SelectTrigger
        aria-label="Journal market"
        className={cn(
          "h-9 w-auto min-w-[9.5rem] gap-2 rounded-lg border border-border bg-card px-2.5 font-normal shadow-none hover:bg-muted",
          !canSwitchRegion && "cursor-default opacity-100",
          className
        )}
      >
        <span className="text-base leading-none" aria-hidden>
          {activeRegion.flag}
        </span>
        <span className="truncate text-sm">{activeRegion.label}</span>
      </SelectTrigger>
      <SelectContent align="end" className="min-w-[12rem]">
        {availableRegions.map((region) => (
          <SelectItem key={region.id} value={region.id}>
            <span className="flex items-center gap-2">
              <span className="text-base leading-none" aria-hidden>
                {region.flag}
              </span>
              <span>{region.label}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
