"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { JournalDirection } from "@/lib/journal-types";
import { formatCurrency } from "@/lib/journal-types";
import {
  TRADE_FIELD_LABELS,
  TradeFieldLabel,
} from "@/components/journal/trade-form-field";
import {
  computeSmartPositionFromLevels,
  computeStopLossPriceFromPercent,
  computeStopPercentFromPrice,
  computeTargetProfitPrice,
  parseRiskRewardRatio,
  SMART_SETUP_DEFAULT_STOP_PERCENT,
  type SmartPositionResult,
} from "@/lib/smart-position-size";
import { cn } from "@/lib/utils";

const numberInputClass =
  "h-8 rounded-md border-border/80 bg-background text-sm font-mono tabular-nums shadow-none [font-feature-settings:'tnum'_1,'lnum'_1]";
const derivedInputClass = cn(
  numberInputClass,
  "pointer-events-none cursor-not-allowed bg-muted/50 text-foreground/80 opacity-100"
);

function sanitizeDecimalInput(value: string) {
  const cleaned = value.replace(/[^\d.]/g, "");
  const dot = cleaned.indexOf(".");
  if (dot === -1) return cleaned;
  return cleaned.slice(0, dot + 1) + cleaned.slice(dot + 1).replace(/\./g, "");
}

function sanitizeIntegerInput(value: string) {
  return value.replace(/\D/g, "");
}

function syncCapitalFromQty(
  qty: string,
  entry: number,
  setCapital: (value: string) => void
) {
  const qtyNum = Number(qty);
  if (!Number.isFinite(entry) || entry <= 0 || !Number.isFinite(qtyNum) || qtyNum <= 0) {
    return;
  }
  setCapital(sanitizeDecimalInput(String(qtyNum * entry)));
}

function syncQtyFromCapital(
  capital: string,
  entry: number,
  setQuantity: (value: string) => void
) {
  const capNum = Number(capital);
  if (!Number.isFinite(entry) || entry <= 0 || !Number.isFinite(capNum) || capNum <= 0) {
    return;
  }
  setQuantity(String(Math.floor(capNum / entry)));
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

function AssistantField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <TradeFieldLabel>{label}</TradeFieldLabel>
      {children}
    </div>
  );
}

export function SmartPositionSizer({
  entryPrice,
  direction: defaultDirection,
  defaultCapital,
  defaultRiskReward,
  onApply,
}: SmartPositionSizerProps) {
  const [open, setOpen] = useState(false);
  const [stockPrice, setStockPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [capital, setCapital] = useState("");
  const [riskReward, setRiskReward] = useState("");
  const [stopLossPrice, setStopLossPrice] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [pressingApply, setPressingApply] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<SmartPositionResult | null>(null);
  const onApplyRef = useRef(onApply);
  onApplyRef.current = onApply;

  const entryHint =
    Number(entryPrice) > 0 ? String(entryPrice) : undefined;
  const capitalHint =
    defaultCapital > 0 ? String(defaultCapital) : undefined;
  const riskRewardHint = defaultRiskReward.trim() || "1:2";

  const resolvedEntry = Number(stockPrice || entryHint || "");
  const resolvedCapital = Number(capital || capitalHint || "");
  const resolvedRiskReward = (riskReward || riskRewardHint).trim();
  const hasValidRiskReward = parseRiskRewardRatio(resolvedRiskReward) != null;

  const derivedStopPercent = useMemo(() => {
    if (!Number.isFinite(resolvedEntry) || resolvedEntry <= 0) return "";
    const stopNum = Number(stopLossPrice);
    if (!Number.isFinite(stopNum) || stopNum <= 0) return "";
    const pct = computeStopPercentFromPrice({
      entryPrice: resolvedEntry,
      stopLossPrice: stopNum,
      direction: defaultDirection,
    });
    return pct != null ? String(pct) : "";
  }, [defaultDirection, resolvedEntry, stopLossPrice]);

  useEffect(() => {
    if (!open) return;
    setStockPrice("");
    setQuantity("");
    setCapital("");
    setRiskReward("");
    setStopLossPrice("");
    setTargetPrice("");
    setPreview(null);
    setError(null);
    setPressingApply(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!Number.isFinite(resolvedEntry) || resolvedEntry <= 0) return;
    if (!hasValidRiskReward) return;

    const stop = computeStopLossPriceFromPercent({
      entryPrice: resolvedEntry,
      stopPercent: SMART_SETUP_DEFAULT_STOP_PERCENT,
      direction: defaultDirection,
    });
    if (stop == null) return;

    const target = computeTargetProfitPrice({
      entryPrice: resolvedEntry,
      stopLossPrice: stop,
      riskReward: resolvedRiskReward,
      direction: defaultDirection,
    });
    if (typeof target !== "number") return;

    setStopLossPrice(String(stop));
    setTargetPrice(String(target));
  }, [
    open,
    resolvedEntry,
    resolvedRiskReward,
    defaultDirection,
    hasValidRiskReward,
  ]);

  useEffect(() => {
    if (!open) return;

    const timer = window.setTimeout(() => {
      const stopNum = Number(stopLossPrice);
      const targetNum = Number(targetPrice);

      if (
        !Number.isFinite(resolvedEntry) ||
        resolvedEntry <= 0 ||
        !Number.isFinite(stopNum) ||
        stopNum <= 0 ||
        !Number.isFinite(targetNum) ||
        targetNum <= 0
      ) {
        setPreview(null);
        setError(null);
        return;
      }

      const result = computeSmartPositionFromLevels({
        entryPrice: resolvedEntry,
        capital: resolvedCapital,
        stopLossPrice: stopNum,
        profitTarget: targetNum,
        direction: defaultDirection,
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
    resolvedEntry,
    resolvedCapital,
    stopLossPrice,
    targetPrice,
    defaultDirection,
  ]);

  function handleApply() {
    if (!preview || pressingApply) return;
    setPressingApply(true);
    const result = preview;

    window.setTimeout(() => {
      setPressingApply(false);
      setOpen(false);
      queueMicrotask(() => {
        onApplyRef.current(result);
      });
    }, 160);
  }

  return (
    <div className={cn("min-w-0", open ? "w-full" : "w-full sm:w-auto")}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 border-emerald-500/30 bg-emerald-500/5 text-emerald-800 hover:bg-emerald-500/10 dark:text-emerald-300"
        onClick={() => setOpen((v) => !v)}
      >
        <Sparkles className="size-3.5" />
        Risk Calculator
      </Button>

      {open ? (
        <div className="mt-3 min-w-0 space-y-3 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
          <p className="text-xs text-muted-foreground">
            Enter {TRADE_FIELD_LABELS.entryPrice.toLowerCase()},{" "}
            {TRADE_FIELD_LABELS.qty.toLowerCase()} or{" "}
            {TRADE_FIELD_LABELS.capital.toLowerCase()}, and{" "}
            {TRADE_FIELD_LABELS.riskReward.toLowerCase()} to auto-fill{" "}
            {TRADE_FIELD_LABELS.stopLoss.toLowerCase()} and{" "}
            {TRADE_FIELD_LABELS.targetPrice.toLowerCase()}. Edit stop or
            target anytime; {TRADE_FIELD_LABELS.stopPercent.toLowerCase()}{" "}
            updates from your stop. Click Apply to update the form.
          </p>
          <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3">
              <AssistantField label={TRADE_FIELD_LABELS.entryPrice}>
                <Input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  className={numberInputClass}
                  value={stockPrice}
                  onChange={(e) => {
                    const nextPrice = sanitizeDecimalInput(e.target.value);
                    setStockPrice(nextPrice);
                    const entry = Number(nextPrice || entryHint || "");
                    if (quantity) {
                      syncCapitalFromQty(quantity, entry, setCapital);
                    } else if (capital) {
                      syncQtyFromCapital(capital, entry, setQuantity);
                    }
                  }}
                  onFocus={selectAllOnFocus}
                  placeholder={entryHint ?? "0.00"}
                />
              </AssistantField>
              <AssistantField label={TRADE_FIELD_LABELS.qty}>
                <Input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  className={numberInputClass}
                  value={quantity}
                  onChange={(e) => {
                    const nextQty = sanitizeIntegerInput(e.target.value);
                    setQuantity(nextQty);
                    if (!nextQty) return;
                    syncCapitalFromQty(
                      nextQty,
                      Number(stockPrice || entryHint || ""),
                      setCapital
                    );
                  }}
                  onFocus={selectAllOnFocus}
                  placeholder="0"
                />
              </AssistantField>
              <AssistantField label={TRADE_FIELD_LABELS.capital}>
                <Input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  className={numberInputClass}
                  value={capital}
                  onChange={(e) => {
                    const nextCapital = sanitizeDecimalInput(e.target.value);
                    setCapital(nextCapital);
                    if (!nextCapital) return;
                    syncQtyFromCapital(
                      nextCapital,
                      Number(stockPrice || entryHint || ""),
                      setQuantity
                    );
                  }}
                  onFocus={selectAllOnFocus}
                  placeholder={capitalHint ?? "10000"}
                />
              </AssistantField>
              <AssistantField label={TRADE_FIELD_LABELS.riskReward}>
                <Input
                  className={numberInputClass}
                  value={riskReward}
                  onChange={(e) => setRiskReward(e.target.value)}
                  onFocus={selectAllOnFocus}
                  placeholder={riskRewardHint}
                />
              </AssistantField>
              <AssistantField label={TRADE_FIELD_LABELS.stopLoss}>
                <Input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  className={numberInputClass}
                  value={stopLossPrice}
                  onChange={(e) =>
                    setStopLossPrice(sanitizeDecimalInput(e.target.value))
                  }
                  onFocus={selectAllOnFocus}
                  placeholder="0.00"
                />
              </AssistantField>
              <AssistantField label={TRADE_FIELD_LABELS.stopPercent}>
                <Input
                  type="text"
                  disabled
                  readOnly
                  tabIndex={-1}
                  aria-readonly="true"
                  className={derivedInputClass}
                  value={derivedStopPercent}
                  placeholder="Auto"
                />
              </AssistantField>
              <AssistantField label={TRADE_FIELD_LABELS.targetPrice}>
                <Input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  className={numberInputClass}
                  value={targetPrice}
                  onChange={(e) =>
                    setTargetPrice(sanitizeDecimalInput(e.target.value))
                  }
                  onFocus={selectAllOnFocus}
                  placeholder="0.00"
                />
              </AssistantField>
            </div>

            {error ? (
              <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>
            ) : null}

            {preview ? (
              <div className="grid min-w-0 grid-cols-2 gap-px overflow-hidden rounded-md border border-border/70 bg-border/70 text-xs sm:grid-cols-3">
                <div className="bg-background/90 px-2 py-2.5 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                    {TRADE_FIELD_LABELS.quantity}
                  </p>
                  <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums">
                    {preview.quantity}
                  </p>
                </div>
                <div className="bg-background/90 px-2 py-2.5 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                    {TRADE_FIELD_LABELS.stopLoss}
                  </p>
                  <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums">
                    {preview.stopLoss}
                  </p>
                </div>
                <div className="bg-background/90 px-2 py-2.5 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                    {TRADE_FIELD_LABELS.targetPrice}
                  </p>
                  <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums">
                    {preview.profitTarget}
                  </p>
                </div>
                <div className="bg-background/90 px-2 py-2.5 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                    Position value
                  </p>
                  <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums">
                    {preview.positionValue}
                  </p>
                </div>
                <div className="bg-background/90 px-2 py-2.5 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                    Max profit
                  </p>
                  <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(preview.maxProfit)}
                  </p>
                </div>
                <div className="bg-background/90 px-2 py-2.5 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                    Max loss
                  </p>
                  <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-rose-600 dark:text-rose-400">
                    {formatCurrency(-preview.maxLoss)}
                  </p>
                </div>
              </div>
            ) : null}

            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                disabled={!preview || pressingApply}
                onClick={handleApply}
                className={cn(
                  "h-8 min-w-[5.5rem] rounded-md border-b-4 border-emerald-800 bg-emerald-600 text-white shadow-none",
                  "transition-all duration-150 ease-out",
                  "hover:bg-emerald-500 hover:border-emerald-800",
                  "active:translate-y-0.5 active:border-b-2",
                  pressingApply && "translate-y-0.5 border-b-2 bg-emerald-700"
                )}
              >
                Apply
              </Button>
            </div>
          </div>
      ) : null}
    </div>
  );
}
