import type { JournalTrade } from "@/lib/journal-types";
import { normalizeListingMarket } from "@/lib/equity-listing-markets";
import { alignExpiryToEntry, optionsBookedPnl } from "@/lib/options-journal";
import { sharesPerOptionLot } from "@/lib/nse-fo-lot-size";
import type { OptionsLegMeta } from "@/lib/options-trade-meta";
import {
  buildExitPlan,
  DEFAULT_EXIT_PLAN_SETTINGS,
  quoteSpread,
  type ExitPlan,
} from "@/lib/options-exit-plan";

function localIsoDate(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function exitPlanSettings(trade: JournalTrade) {
  const plan = trade.optionsMeta?.exitPlan;
  return plan
    ? {
        lossMultiple: plan.lossMultiple,
        debitStopPct: plan.debitStopPct,
        profitTargetPct: plan.profitTargetPct,
      }
    : DEFAULT_EXIT_PLAN_SETTINGS;
}

function preparedLegs(trade: JournalTrade): OptionsLegMeta[] {
  const legs = trade.optionsMeta?.legs ?? [];
  if (!legs.length) return [];
  const notBefore =
    (trade.status ?? "Closed") === "Active" ? localIsoDate() : undefined;
  return legs.map((leg) => ({
    ...leg,
    expiry: leg.expiry
      ? alignExpiryToEntry(leg.expiry, trade.entryDate, notBefore)
      : leg.expiry,
  }));
}

function lotMultiplier(trade: JournalTrade) {
  const shares = sharesPerOptionLot(
    trade.ticker,
    normalizeListingMarket(trade.listingMarket ?? "IN_NSE")
  );
  return shares != null && shares > 0 ? shares : undefined;
}

export function optionsSharesScale(trade: JournalTrade) {
  return sharesScale(trade);
}

function sharesScale(trade: JournalTrade) {
  const lot = lotMultiplier(trade) ?? 1;
  return lot * Math.max(1, trade.quantity);
}

function pnlFromMarks(
  trade: JournalTrade,
  entryMark: number,
  exitMark: number
) {
  const isCredit = trade.direction === "Short";
  const perShare = isCredit ? entryMark - exitMark : exitMark - entryMark;
  return Math.round(perShare * sharesScale(trade) * 100) / 100;
}

export function buildOptionsPlan(trade: JournalTrade, spot: number) {
  return buildPlan(trade, spot);
}

export type PositionGreeks = {
  /** ₹ change for a 1-point move in the underlying. */
  delta: number;
  /** ₹ P&L for a 1% move in the underlying. */
  delta1Pct: number;
  /** ₹ convexity P&L for a 1% move (either direction). */
  gamma1Pct: number;
  /** ₹ P&L from one calendar day passing. */
  theta: number;
  /** ₹ P&L for a 1 vol-point rise in implied volatility. */
  vega: number;
};

/** Position Greeks by finite difference on the Black-Scholes spread model. */
export function planGreeks(
  plan: ExitPlan,
  spot: number,
  at = new Date()
): PositionGreeks {
  const scale = (plan.multiplier ?? 1) * plan.contracts;
  const pnl = (s: number, when = at, p = plan) => quoteSpread(p, s, when).pnl;
  const h = Math.max(spot * 0.005, 0.01);
  const mid = pnl(spot);
  const up = pnl(spot + h);
  const down = pnl(spot - h);
  const delta = ((up - down) / (2 * h)) * scale;
  const gamma = ((up - 2 * mid + down) / (h * h)) * scale;
  const tomorrow = new Date(at.getTime() + 86_400_000);
  const bumped: ExitPlan = {
    ...plan,
    quotes: plan.quotes.map((leg) => ({ ...leg, iv: leg.iv + 0.01 })),
  };
  const move = spot * 0.01;
  return {
    delta,
    delta1Pct: delta * move,
    gamma1Pct: 0.5 * gamma * move * move,
    theta: (pnl(spot, tomorrow) - mid) * scale,
    vega: (pnl(spot, at, bumped) - mid) * scale,
  };
}

function buildPlan(trade: JournalTrade, spot: number) {
  const legs = preparedLegs(trade);
  if (!legs.length || !(spot > 0)) return null;
  return buildExitPlan({
    legs,
    contracts: trade.quantity,
    entryDate: trade.entryDate,
    spot,
    listingMarket: normalizeListingMarket(trade.listingMarket ?? "IN_NSE"),
    settings: exitPlanSettings(trade),
    multiplier: lotMultiplier(trade),
  });
}

/** Estimated spread mark (per-share premium to close). */
export function optionsSpreadMark(
  trade: JournalTrade,
  spot: number | null
): number | null {
  if ((trade.status ?? "Closed") !== "Active") {
    return trade.exitPrice > 0 ? trade.exitPrice : trade.entryPrice;
  }

  if (spot != null && spot > 0) {
    const plan = buildPlan(trade, spot);
    if (plan) {
      return quoteSpread(plan, spot, new Date()).exitPrice;
    }
  }

  return trade.entryPrice;
}

/** Unrealized P&L in account currency for an open options trade. */
export function optionsOpenUnrealizedPnl(
  trade: JournalTrade,
  spot: number | null
): number {
  if ((trade.status ?? "Closed") !== "Active") return 0;

  if (spot != null && spot > 0) {
    const plan = buildPlan(trade, spot);
    if (plan) {
      const { pnl } = quoteSpread(plan, spot, new Date());
      const scale = (plan.multiplier ?? 1) * plan.contracts;
      return Math.round(pnl * scale * 100) / 100;
    }
  }

  const mark = optionsSpreadMark(trade, spot);
  if (mark == null) return 0;
  return pnlFromMarks(trade, trade.entryPrice, mark);
}

/** Open = mark-to-market; closed/assigned = booked P&L. */
export function optionsPositionProfit(
  trade: JournalTrade,
  spot: number | null
): number {
  if ((trade.status ?? "Closed") === "Active") {
    return optionsOpenUnrealizedPnl(trade, spot);
  }
  return optionsBookedPnl(trade);
}
