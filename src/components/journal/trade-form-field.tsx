import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Uppercase micro-labels for the log-trade form and assistants. */
export const tradeFieldLabelClass =
  "text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground";

export const TRADE_FIELD_LABELS = {
  exchange: "Exchange",
  tradeStatus: "Trade status",
  symbol: "Symbol",
  entryDate: "Entry date",
  exitDate: "Exit date",
  entryPrice: "Entry price",
  exitPrice: "Exit price",
  quantity: "Quantity",
  stopLoss: "Stop loss",
  targetPrice: "Target price",
  stopPercent: "Stop %",
  capital: "Capital",
  qty: "Qty",
  riskReward: "Risk : reward",
  notes: "Notes",
  chartAttachment: "Chart attachment",
  stopAtrMultiple: "Stop ATR multiple",
  targetAtrMultiple: "Target ATR multiple",
} as const;

export function TradeFieldLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <Label className={cn(tradeFieldLabelClass, className)}>{children}</Label>
  );
}

export function TradeField({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <TradeFieldLabel>{label}</TradeFieldLabel>
      {children}
    </div>
  );
}
