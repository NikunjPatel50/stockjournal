"use client";

import { useMemo } from "react";
import { AnimatedCurrency } from "@/components/ui/animated-number";
import { useMarketQuotes } from "@/hooks/use-market-quotes";
import type { OptionsPositionView } from "@/lib/options-journal";
import { optionsPositionProfit } from "@/lib/options-spread-mark";
import type { CurrencyCode } from "@/lib/settings";
import { cn, NUMERIC_DISPLAY_CLASS } from "@/lib/utils";

function toneClass(value: number) {
  if (value > 0) return "text-emerald-600 dark:text-emerald-400";
  if (value < 0) return "text-rose-600 dark:text-rose-400";
  return "text-foreground";
}

export function BookProfit({
  positions,
  currency,
}: {
  positions: OptionsPositionView[];
  currency: CurrencyCode;
}) {
  const { getQuote, quoteRevision } = useMarketQuotes();

  const total = useMemo(() => {
    void quoteRevision;
    return positions.reduce((sum, position) => {
      const trade = position.source;
      const quote = getQuote(trade);
      const spot =
        position.status === "Open" ? (quote?.price ?? null) : null;
      return sum + optionsPositionProfit(trade, spot);
    }, 0);
  }, [positions, getQuote, quoteRevision]);

  return (
    <span className={cn(NUMERIC_DISPLAY_CLASS, toneClass(total))}>
      <AnimatedCurrency value={total} currency={currency} />
    </span>
  );
}

export function PositionProfit({
  position,
  currency,
}: {
  position: OptionsPositionView;
  currency: CurrencyCode;
}) {
  const { getQuote, quoteRevision } = useMarketQuotes();
  const trade = position.source;

  const profit = useMemo(() => {
    void quoteRevision;
    const quote = getQuote(trade);
    const spot =
      position.status === "Open" ? (quote?.price ?? null) : null;
    return optionsPositionProfit(trade, spot);
  }, [position.status, trade, getQuote, quoteRevision]);

  return (
    <span className={cn(NUMERIC_DISPLAY_CLASS, toneClass(profit))}>
      <AnimatedCurrency value={profit} currency={currency} />
    </span>
  );
}
