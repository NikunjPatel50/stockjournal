"use client";

import { useMemo, useState } from "react";
import { History } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { JournalTrade } from "@/lib/journal-types";
import {
  applyRepeatSetupToPricing,
  extractRepeatSetupFields,
  findRepeatSetupSource,
  type RepeatSetupFields,
} from "@/lib/repeat-trade-setup";
import type { SmartPositionResult } from "@/lib/smart-position-size";
import { normalizeEquityTicker } from "@/lib/ticker-normalize";

type RepeatSetupProps = {
  ticker: string;
  entryPrice: number | string;
  trades: JournalTrade[];
  excludeTradeId?: string;
  onBeforeOpen?: () => Promise<string>;
  onApply: (payload: {
    fields: RepeatSetupFields;
    source: JournalTrade;
    pricing?: Pick<SmartPositionResult, "entryPrice" | "stopLoss" | "profitTarget">;
    quantity?: number;
  }) => void;
};

export function RepeatSetup({
  ticker,
  entryPrice,
  trades,
  excludeTradeId,
  onBeforeOpen,
  onApply,
}: RepeatSetupProps) {
  const [appliedFrom, setAppliedFrom] = useState<string | null>(null);

  const source = useMemo(
    () => findRepeatSetupSource(trades, ticker, excludeTradeId),
    [trades, ticker, excludeTradeId]
  );

  if (!source || trades.length === 0) return null;

  const normalizedTicker = ticker
    ? normalizeEquityTicker(ticker)?.toUpperCase()
    : "";
  const sameTicker =
    normalizedTicker &&
    normalizeEquityTicker(source.ticker)?.toUpperCase() === normalizedTicker;

  async function handleApply() {
    const latestTicker = onBeforeOpen ? await onBeforeOpen() : ticker;
    const match = findRepeatSetupSource(trades, latestTicker, excludeTradeId);
    if (!match) {
      toast.error("No previous trade to copy from.");
      return;
    }

    const fields = extractRepeatSetupFields(match);
    const price = Number(entryPrice);
    const pricing =
      Number.isFinite(price) && price > 0
        ? applyRepeatSetupToPricing(price, fields)
        : undefined;

    if (pricing && "error" in pricing) {
      toast.error(pricing.error);
      return;
    }

    onApply({
      fields,
      source: match,
      pricing: pricing && !("error" in pricing) ? pricing : undefined,
      quantity: fields.quantity,
    });

    setAppliedFrom(match.ticker);
    const fromSameTicker =
      latestTicker &&
      normalizeEquityTicker(match.ticker)?.toUpperCase() ===
        normalizeEquityTicker(latestTicker)?.toUpperCase();
    toast.success(
      fromSameTicker
        ? `Copied setup from your last ${match.ticker} trade`
        : `Copied setup from ${match.ticker}`
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 border-violet-500/30 bg-violet-500/5 text-violet-800 hover:bg-violet-500/10 dark:text-violet-300"
        onClick={() => void handleApply()}
        title={
          sameTicker
            ? `Copy setup from your last ${source.ticker} trade`
            : `Copy setup from your last trade (${source.ticker})`
        }
      >
        <History className="size-3.5" />
        Repeat setup
      </Button>
      {appliedFrom ? (
        <p className="text-[10px] text-muted-foreground">
          Applied from {appliedFrom}
        </p>
      ) : null}
    </div>
  );
}
