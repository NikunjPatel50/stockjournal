"use client";

import { LineChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  openNseTradingViewDailyChart,
  openTradingViewDailySymbol,
} from "@/lib/tradingview";
import { cn } from "@/lib/utils";

export function ScreenerChartButton({
  ticker,
  symbol,
  label,
  className,
}: {
  ticker?: string;
  symbol?: string | null;
  label?: string;
  className?: string;
}) {
  const name = label ?? ticker ?? symbol ?? "chart";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      className={cn(
        "size-6 shrink-0 text-muted-foreground hover:text-foreground",
        className
      )}
      title="Open TradingView chart (daily)"
      aria-label={`Open ${name} daily chart on TradingView`}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (symbol) {
          openTradingViewDailySymbol(symbol);
          return;
        }
        if (ticker) openNseTradingViewDailyChart(ticker);
      }}
    >
      <LineChart className="size-3.5" />
    </Button>
  );
}
