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

export function JournalMarketSelector({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
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
          "animate-pulse rounded-lg bg-muted",
          compact ? "size-8" : "h-9 w-[9.5rem]",
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
        aria-label={`Journal market: ${activeRegion.label}`}
        className={cn(
          "rounded-lg border border-border bg-card font-normal shadow-none hover:bg-muted",
          compact
            ? "size-8 justify-center gap-0 px-0"
            : "h-9 w-auto min-w-[9.5rem] gap-2 px-2.5",
          !canSwitchRegion && "cursor-default opacity-100",
          className
        )}
      >
        <span className="text-base leading-none" aria-hidden>
          {activeRegion.flag}
        </span>
        {!compact ? (
          <span className="truncate text-sm">{activeRegion.label}</span>
        ) : null}
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
