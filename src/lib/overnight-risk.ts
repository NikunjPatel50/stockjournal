import type { AssetClass, JournalTrade } from "@/lib/journal-types";
import { isClosedTrade } from "@/lib/journal-types";
import { classifyGapRisk, type GapRiskKind } from "@/lib/market-hours";

export const DEFAULT_OVERNIGHT_RISK_WARN_PCT = 25;
export const DEFAULT_OVERNIGHT_RISK_DANGER_PCT = 50;

export type OvernightExposureRow = {
  tradeId: string;
  ticker: string;
  assetClass: AssetClass;
  quantity: number;
  priceUsed: number;
  usesEntryPrice: boolean;
  notionalAtRisk: number;
  gapRisk: GapRiskKind;
};

export type OvernightRiskSummary = {
  rows: OvernightExposureRow[];
  totalExposed: number;
  accountEquity: number;
  exposedPct: number;
  usesEntryPriceOnly: boolean;
  marketGapKind: GapRiskKind;
};

export function computeAccountEquity(
  trades: JournalTrade[],
  startingBalance: number
): number {
  const realized = trades
    .filter((t) => isClosedTrade(t))
    .reduce((sum, t) => sum + t.pnl, 0);
  // `startingBalance` stores total money invested (Settings → Profile).
  return startingBalance + realized;
}

function positionNotional(trade: JournalTrade): {
  priceUsed: number;
  usesEntryPrice: boolean;
  notional: number;
} {
  const usesEntryPrice = true;
  const priceUsed = trade.entryPrice;
  const notional = Math.abs(trade.quantity * priceUsed);
  return { priceUsed, usesEntryPrice, notional };
}

export function computeOvernightRisk(
  trades: JournalTrade[],
  startingBalance: number,
  now = new Date()
): OvernightRiskSummary {
  const active = trades.filter((t) => t.status === "Active");
  const accountEquity = computeAccountEquity(trades, startingBalance);

  const rows: OvernightExposureRow[] = active.map((trade) => {
    const { priceUsed, usesEntryPrice, notional } = positionNotional(trade);
    return {
      tradeId: trade.id,
      ticker: trade.ticker,
      assetClass: trade.assetClass,
      quantity: trade.quantity,
      priceUsed,
      usesEntryPrice,
      notionalAtRisk: notional,
      gapRisk: classifyGapRisk(now, trade.assetClass),
    };
  });

  rows.sort((a, b) => b.notionalAtRisk - a.notionalAtRisk);

  const totalExposed = rows.reduce((s, r) => s + r.notionalAtRisk, 0);
  const exposedPct =
    accountEquity > 0 ? (totalExposed / accountEquity) * 100 : 0;

  const dominantGap: GapRiskKind =
    rows.some((r) => r.gapRisk === "weekend")
      ? "weekend"
      : rows.some((r) => r.gapRisk === "holiday")
        ? "holiday"
        : "overnight";

  return {
    rows,
    totalExposed,
    accountEquity,
    exposedPct,
    usesEntryPriceOnly: true,
    marketGapKind: dominantGap,
  };
}

export function overnightRiskTone(
  exposedPct: number,
  warnPct = DEFAULT_OVERNIGHT_RISK_WARN_PCT,
  dangerPct = DEFAULT_OVERNIGHT_RISK_DANGER_PCT
): "safe" | "warn" | "danger" {
  if (exposedPct >= dangerPct) return "danger";
  if (exposedPct >= warnPct) return "warn";
  return "safe";
}
