"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { JournalDirection } from "@/lib/journal-types";
import { formatCurrency } from "@/lib/journal-types";
import {
  computeSmartPosition,
  type SmartPositionResult,
} from "@/lib/smart-position-size";

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

type SmartPositionSizerProps = {
  entryPrice: number | string;
  direction: JournalDirection;
  defaultCapital: number;
  defaultRiskReward: string;
  onApply: (result: SmartPositionResult) => void;
};

export function SmartPositionSizer({
  entryPrice,
  direction: defaultDirection,
  defaultCapital,
  defaultRiskReward,
  onApply,
}: SmartPositionSizerProps) {
  const [open, setOpen] = useState(false);
  const [stockPrice, setStockPrice] = useState("");
  const [capital, setCapital] = useState("");
  const [riskReward, setRiskReward] = useState("");
  const [stopPercent, setStopPercent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<SmartPositionResult | null>(null);
  const onApplyRef = useRef(onApply);
  onApplyRef.current = onApply;

  const entryHint =
    Number(entryPrice) > 0 ? String(entryPrice) : undefined;
  const capitalHint =
    defaultCapital > 0 ? String(defaultCapital) : undefined;
  const riskRewardHint = defaultRiskReward.trim() || "1:2";

  useEffect(() => {
    if (!open) return;
    setStockPrice("");
    setCapital("");
    setRiskReward("");
    setStopPercent("");
    setPreview(null);
    setError(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const timer = window.setTimeout(() => {
      const result = computeSmartPosition({
        entryPrice: Number(stockPrice || entryHint || ""),
        capital: Number(capital || capitalHint || ""),
        riskReward: riskReward || riskRewardHint,
        direction: defaultDirection,
        stopPercent: Number(stopPercent || "2"),
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
  }, [
    open,
    stockPrice,
    capital,
    riskReward,
    stopPercent,
    defaultDirection,
    entryHint,
    capitalHint,
    riskRewardHint,
  ]);

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
        className="h-8 gap-1.5 border-emerald-500/30 bg-emerald-500/5 text-emerald-800 hover:bg-emerald-500/10 dark:text-emerald-300"
        onClick={() => setOpen((v) => !v)}
      >
        <Sparkles className="size-3.5" />
        Smart Setup
      </Button>

      {open ? (
        <div className="w-full basis-full">
          <div className="mt-3 space-y-3 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
            <p className="text-xs text-muted-foreground">
              Size from capital, set stop from stop %, and target from your
              risk:reward ratio. Preview updates as you type; click Apply to
              fill the form.
            </p>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Stock price
                </Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  className={numberInputClass}
                  value={stockPrice}
                  onChange={(e) =>
                    setStockPrice(sanitizeDecimalInput(e.target.value))
                  }
                  onFocus={selectAllOnFocus}
                  placeholder={entryHint ?? "Entry price"}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Capital to invest
                </Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  className={numberInputClass}
                  value={capital}
                  onChange={(e) =>
                    setCapital(sanitizeDecimalInput(e.target.value))
                  }
                  onFocus={selectAllOnFocus}
                  placeholder={capitalHint ?? "10000"}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Risk : reward
                </Label>
                <Input
                  className={numberInputClass}
                  value={riskReward}
                  onChange={(e) => setRiskReward(e.target.value)}
                  onFocus={selectAllOnFocus}
                  placeholder={riskRewardHint}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Stop % from entry
                </Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  className={numberInputClass}
                  value={stopPercent}
                  onChange={(e) =>
                    setStopPercent(sanitizeDecimalInput(e.target.value))
                  }
                  onFocus={selectAllOnFocus}
                  placeholder="2"
                />
              </div>
            </div>

            {error ? (
              <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>
            ) : null}

            {preview ? (
              <div className="grid grid-cols-2 gap-2 rounded-md border border-border/80 bg-background/80 p-3 text-xs sm:grid-cols-3 lg:grid-cols-6">
                <div className="text-center">
                  <p className="text-muted-foreground">Quantity</p>
                  <p className="font-semibold tabular-nums">{preview.quantity}</p>
                </div>
                <div className="text-center">
                  <p className="text-muted-foreground">Stop loss</p>
                  <p className="font-semibold tabular-nums">{preview.stopLoss}</p>
                </div>
                <div className="text-center">
                  <p className="text-muted-foreground">Profit target</p>
                  <p className="font-semibold tabular-nums">
                    {preview.profitTarget}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-muted-foreground">Position</p>
                  <p className="font-semibold tabular-nums">
                    {preview.positionValue}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-muted-foreground">Max profit</p>
                  <p className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(preview.maxProfit)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-muted-foreground">Max loss</p>
                  <p className="font-semibold tabular-nums text-rose-600 dark:text-rose-400">
                    {formatCurrency(-preview.maxLoss)}
                  </p>
                </div>
              </div>
            ) : null}

            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                className="h-8 bg-emerald-600 hover:bg-emerald-600/90"
                disabled={!preview}
                onClick={handleApply}
              >
                Apply
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
