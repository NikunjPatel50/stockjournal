"use client";

import { useEffect, useRef, useState } from "react";
import { Activity, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ListingMarketId } from "@/lib/equity-listing-markets";
import type { JournalDirection } from "@/lib/journal-types";
import { formatCurrency } from "@/lib/journal-types";
import {
  computeAtrLevels,
  type SmartPositionResult,
} from "@/lib/smart-position-size";
import { normalizeEquityTicker, parseTickerInput } from "@/lib/ticker-normalize";
import { cn } from "@/lib/utils";

const numberInputClass =
  "h-9 bg-background font-sans tabular-nums [font-feature-settings:'tnum'_1,'lnum'_1]";

function sanitizeDecimalInput(value: string) {
  const cleaned = value.replace(/[^\d.]/g, "");
  const dot = cleaned.indexOf(".");
  if (dot === -1) return cleaned;
  return cleaned.slice(0, dot + 1) + cleaned.slice(dot + 1).replace(/\./g, "");
}

function selectAllOnFocus(event: React.FocusEvent<HTMLInputElement>) {
  requestAnimationFrame(() => event.target.select());
}

type SmartAtrLevelsProps = {
  ticker: string;
  listingMarket: ListingMarketId;
  entryDate: string;
  entryPrice: number | string;
  direction: JournalDirection;
  /** Commit ticker from Setup (e.g. blur symbol search) before opening. */
  onBeforeOpen?: () => Promise<string>;
  onApply: (result: SmartPositionResult) => void;
};

export function SmartAtrLevels({
  ticker,
  listingMarket,
  entryDate,
  entryPrice,
  direction,
  onBeforeOpen,
  onApply,
}: SmartAtrLevelsProps) {
  const [open, setOpen] = useState(false);
  const [activeTicker, setActiveTicker] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [atr14, setAtr14] = useState<number | null>(null);
  const [stopMultiple, setStopMultiple] = useState("");
  const [targetMultiple, setTargetMultiple] = useState("");
  const [entryInput, setEntryInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<SmartPositionResult | null>(null);
  const onApplyRef = useRef(onApply);
  onApplyRef.current = onApply;

  const entryHint =
    Number(entryPrice) > 0 ? String(entryPrice) : undefined;

  function resolveTickerSymbol(raw: string) {
    return parseTickerInput(raw) || normalizeEquityTicker(raw);
  }

  const normalizedTicker =
    activeTicker || resolveTickerSymbol(ticker);

  async function handleToggle() {
    if (open) {
      setOpen(false);
      setActiveTicker("");
      return;
    }

    const latest = onBeforeOpen ? await onBeforeOpen() : ticker;
    const symbol = resolveTickerSymbol(latest);
    if (!symbol) {
      setActiveTicker("");
      setFetchError("Enter a ticker in Setup above, then try again.");
      setOpen(true);
      return;
    }

    setActiveTicker(symbol);
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    setStopMultiple("");
    setTargetMultiple("");
    setEntryInput("");
    setPreview(null);
    setError(null);
    setFetchError(null);
    setAtr14(null);

    const symbol = activeTicker || resolveTickerSymbol(ticker);
    if (!symbol) {
      setFetchError("Enter a ticker in Setup above, then try again.");
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    void fetch("/api/market-data/atr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticker: symbol,
        listingMarket,
        entryDate,
      }),
      signal: controller.signal,
    })
      .then(async (res) => {
        const data = (await res.json()) as {
          error?: string;
          atr14?: number;
        };
        if (!res.ok) {
          throw new Error(data.error ?? "Could not load ATR");
        }
        if (data.atr14 == null || !Number.isFinite(data.atr14)) {
          throw new Error("ATR is not available for this symbol.");
        }
        setAtr14(data.atr14);
      })
      .catch((err) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setFetchError(
          err instanceof Error ? err.message : "Could not load ATR"
        );
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [open, activeTicker, ticker, listingMarket, entryDate]);

  useEffect(() => {
    if (!open || atr14 == null) return;

    const timer = window.setTimeout(() => {
      const result = computeAtrLevels({
        entryPrice: Number(entryInput || entryHint || ""),
        atr14,
        stopAtrMultiple: Number(stopMultiple || "1"),
        targetAtrMultiple: Number(targetMultiple || "2"),
        direction,
      });
      if ("error" in result) {
        setPreview(null);
        setError(result.error);
        return;
      }
      setPreview(result);
      setError(null);
    }, 200);

    return () => window.clearTimeout(timer);
  }, [open, atr14, stopMultiple, targetMultiple, direction, entryHint, entryInput]);

  function handleApply() {
    if (!preview) return;
    const result = preview;
    setOpen(false);
    queueMicrotask(() => {
      onApplyRef.current(result);
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 border-amber-500/30 bg-amber-500/5 text-amber-900 hover:bg-amber-500/10 dark:text-amber-300"
        onClick={() => void handleToggle()}
      >
        <Activity className="size-3.5" />
        ATR stops
      </Button>

      {open ? (
        <div className="w-full basis-full">
        <div className="mt-3 space-y-3 rounded-lg border border-amber-500/20 bg-amber-500/[0.04] p-4">
          {loading ? (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Loading 14-day ATR for {activeTicker || normalizedTicker}…
            </p>
          ) : fetchError ? (
            <p className="text-xs text-rose-600 dark:text-rose-400">
              {fetchError}
            </p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                Stop and target from ATR(14)
                {atr14 != null ? (
                  <>
                    {" "}
                    — current ATR{" "}
                    <span className="font-medium text-foreground">
                      {atr14.toFixed(2)}
                    </span>
                  </>
                ) : null}
                . Apply fills stop and target; adjust quantity yourself or use
                Smart Setup.
              </p>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Entry price
                  </Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    className={numberInputClass}
                    value={entryInput}
                    onChange={(e) =>
                      setEntryInput(sanitizeDecimalInput(e.target.value))
                    }
                    onFocus={selectAllOnFocus}
                    placeholder={entryHint ?? "Entry price"}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Stop (× ATR)
                  </Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    className={numberInputClass}
                    value={stopMultiple}
                    onChange={(e) =>
                      setStopMultiple(sanitizeDecimalInput(e.target.value))
                    }
                    onFocus={selectAllOnFocus}
                    placeholder="1"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Target (× ATR)
                  </Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    className={numberInputClass}
                    value={targetMultiple}
                    onChange={(e) =>
                      setTargetMultiple(sanitizeDecimalInput(e.target.value))
                    }
                    onFocus={selectAllOnFocus}
                    placeholder="2"
                  />
                </div>
              </div>

              {error ? (
                <p className="text-xs text-rose-600 dark:text-rose-400">
                  {error}
                </p>
              ) : null}

              {preview ? (
                <div className="grid grid-cols-2 gap-2 rounded-md border border-border/80 bg-muted/30 p-3 text-xs sm:grid-cols-4">
                  <div className="text-center">
                    <p className="text-muted-foreground">Stop loss</p>
                    <p className="font-semibold tabular-nums">
                      {preview.stopLoss}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground">Profit target</p>
                    <p className="font-semibold tabular-nums">
                      {preview.profitTarget}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground">Planned R</p>
                    <p className="font-semibold tabular-nums">
                      {preview.riskRewardLabel}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground">Risk / share</p>
                    <p
                      className={cn(
                        "font-semibold tabular-nums text-rose-600 dark:text-rose-400"
                      )}
                    >
                      {formatCurrency(preview.riskPerShare)}
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  className="h-8 bg-amber-600 hover:bg-amber-600/90"
                  disabled={!preview}
                  onClick={handleApply}
                >
                  Apply levels
                </Button>
              </div>
            </>
          )}
        </div>
        </div>
      ) : null}
    </>
  );
}
