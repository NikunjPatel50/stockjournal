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

export function computeTotalInvested(trades: JournalTrade[]): number {
  return (
    Math.round(
      trades
        .filter((t) => (t.status ?? "Closed") === "Active")
        .reduce((sum, t) => sum + Math.abs(t.entryPrice * t.quantity), 0) * 100
    ) / 100
  );
}

/** Capital base for return % when no open positions (sum of trade entry notionals). */
export function computeDeployedCapital(trades: JournalTrade[]): number {
  return (
    Math.round(
      trades.reduce(
        (sum, t) => sum + Math.abs(t.entryPrice * t.quantity),
        0
      ) * 100
    ) / 100
  );
}

export function computeCapitalBase(trades: JournalTrade[]): number {
  const activeInvested = computeTotalInvested(trades);
  return activeInvested > 0 ? activeInvested : computeDeployedCapital(trades);
}

export function computeAccountEquity(trades: JournalTrade[]): number {
  const activeInvested = computeTotalInvested(trades);
  const realized = trades
    .filter((t) => isClosedTrade(t))
    .reduce((sum, t) => sum + t.pnl, 0);
  return Math.round((activeInvested + realized) * 100) / 100;
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
  now = new Date()
): OvernightRiskSummary {
  const active = trades.filter((t) => t.status === "Active");
  const accountEquity = computeAccountEquity(trades);

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
