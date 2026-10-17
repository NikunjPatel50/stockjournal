"use client";

import { useIsAdmin } from "@/components/admin/admin-access-provider";
import { useInstrumentMode } from "@/components/instrument-mode-provider";
import type { InstrumentMode } from "@/lib/instrument-mode";
import { cn } from "@/lib/utils";

const MODES: { value: InstrumentMode; label: string }[] = [
  { value: "stocks", label: "Stocks" },
  { value: "options", label: "Options" },
];

export function InstrumentModeSwitch({ compact = false }: { compact?: boolean }) {
  const { mode, selectMode, prefetchMode } = useInstrumentMode();
  const isAdmin = useIsAdmin();
  if (!isAdmin) return null;

  return (
    <div
      role="tablist"
      aria-label="Instrument"
      className={cn(
        "relative inline-grid shrink-0 grid-cols-2 items-center rounded-md border border-border bg-muted/60 p-0.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.18)]",
        compact ? "h-8" : "h-9"
      )}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute top-0.5 bottom-0.5 left-0.5 w-[calc(50%-0.25rem)] rounded-[5px] bg-emerald-600 shadow-sm ring-1 ring-emerald-500/40 transition-transform duration-200 ease-out",
          mode === "options" && "translate-x-[calc(100%+0.25rem)]"
        )}
      />
      {MODES.map((item) => {
        const active = mode === item.value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            onPointerEnter={() => prefetchMode(item.value)}
            onFocus={() => prefetchMode(item.value)}
            onPointerDown={(event) => {
              if (event.button === 0) selectMode(item.value);
            }}
            onClick={() => selectMode(item.value)}
            className={cn(
              "relative z-10 whitespace-nowrap rounded-[5px] font-medium transition-colors",
              compact ? "h-7 px-3 text-xs" : "h-8 px-3.5 text-sm",
              active
                ? "text-white"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
