"use client";

import { TargetStopProgressBar } from "@/components/journal/target-stop-progress-bar";
import { useMarketQuotes, useTradeQuote } from "@/hooks/use-market-quotes";
import type { OptionsPositionView } from "@/lib/options-journal";
import { optionsSpreadMark } from "@/lib/options-spread-mark";
import type { CurrencyCode } from "@/lib/settings";

export function OptionsTargetStopCell({
  position,
  currency,
}: {
  position: OptionsPositionView;
  currency: CurrencyCode;
}) {
  const trade = position.source;
  const isOpen = position.status === "Open";
  const { loading: quotesLoading } = useMarketQuotes();
  const quote = useTradeQuote(trade, currency);
  const spot = isOpen ? (quote?.price ?? null) : null;
  const currentPrice = optionsSpreadMark(trade, spot);
  const needsQuote =
    isOpen &&
    Boolean(trade.optionsMeta?.legs?.length) &&
    (trade.stopLoss > 0 || trade.profitTarget > 0);

  return (
    <div onClick={(event) => event.stopPropagation()}>
      <TargetStopProgressBar
        trade={trade}
        currentPrice={currentPrice}
        loading={needsQuote && quotesLoading && spot == null}
        compact
      />
    </div>
  );
}
