import { format, parseISO, startOfMonth, subMonths } from "date-fns";
import type { OptionsPositionView } from "@/lib/options-journal";
import {
  buildOptionsPlan,
  optionsOpenUnrealizedPnl,
  optionsSharesScale,
  optionsSpreadMark,
  planGreeks,
  type PositionGreeks,
} from "@/lib/options-spread-mark";
import {
  computeTargetStopProgress,
  type TargetStopProgress,
} from "@/lib/trade-target-progress";

export type SpotSource = "live" | "entry" | "none";

export type RiskState = "stop" | "near-stop" | "near-target" | "target" | "ok" | "unplanned";

export type DeskPosition = {
  position: OptionsPositionView;
  spot: number | null;
  spotSource: SpotSource;
  mark: number | null;
  pnl: number;
  greeks: PositionGreeks | null;
  capitalAtRisk: number;
  margin: number;
  /** Signed ₹ premium: + received, − paid. */
  premium: number;
  progress: TargetStopProgress | null;
  risk: RiskState;
};

const NEAR_THRESHOLD = 70;

function riskState(progress: TargetStopProgress | null): RiskState {
  if (!progress) return "unplanned";
  if (progress.hasStop && progress.stopPct >= 100) return "stop";
  if (progress.hasTarget && progress.targetPct >= 100) return "target";
  if (progress.hasStop && progress.stopPct >= NEAR_THRESHOLD) return "near-stop";
  if (progress.hasTarget && progress.targetPct >= NEAR_THRESHOLD) return "near-target";
  return "ok";
}

export function buildDeskPosition(
  position: OptionsPositionView,
  liveSpot: number | null
): DeskPosition {
  const trade = position.source;
  const entrySpot = trade.optionsMeta?.spotAtEntry ?? null;
  const spot = liveSpot ?? entrySpot;
  const spotSource: SpotSource =
    liveSpot != null ? "live" : entrySpot != null ? "entry" : "none";

  const plan = spot != null ? buildOptionsPlan(trade, spot) : null;
  const scale = optionsSharesScale(trade);
  const mark = optionsSpreadMark(trade, liveSpot);
  const pnl = optionsOpenUnrealizedPnl(trade, liveSpot);

  const payoff = trade.optionsMeta?.payoff;
  const capitalAtRisk =
    payoff?.maxLoss != null && !payoff.maxLossUnlimited
      ? Math.abs(payoff.maxLoss)
      : (position.maxRisk ?? 0);

  const progress =
    mark != null
      ? computeTargetStopProgress({
          direction: trade.direction,
          entryPrice: trade.entryPrice,
          profitTarget: trade.profitTarget,
          stopLoss: trade.stopLoss,
          currentPrice: mark,
        })
      : null;

  return {
    position,
    spot,
    spotSource,
    mark,
    pnl,
    greeks: plan && spot != null ? planGreeks(plan, spot) : null,
    capitalAtRisk,
    margin: payoff?.marginNeeded ?? payoff?.fundsNeeded ?? 0,
    premium:
      (trade.direction === "Short" ? 1 : -1) * trade.entryPrice * scale,
    progress,
    risk: riskState(progress),
  };
}

export type DeskGreeks = {
  delta1Pct: number;
  gamma1Pct: number;
  theta: number;
  vega: number;
  covered: number;
};

export function sumGreeks(rows: DeskPosition[]): DeskGreeks {
  return rows.reduce<DeskGreeks>(
    (acc, row) =>
      row.greeks
        ? {
            delta1Pct: acc.delta1Pct + row.greeks.delta1Pct,
            gamma1Pct: acc.gamma1Pct + row.greeks.gamma1Pct,
            theta: acc.theta + row.greeks.theta,
            vega: acc.vega + row.greeks.vega,
            covered: acc.covered + 1,
          }
        : acc,
    { delta1Pct: 0, gamma1Pct: 0, theta: 0, vega: 0, covered: 0 }
  );
}

export type ExpiryBucket = {
  expiry: string;
  dte: number;
  positions: DeskPosition[];
  capitalAtRisk: number;
  theta: number;
  pnl: number;
};

export function expiryLadder(rows: DeskPosition[]): ExpiryBucket[] {
  const map = new Map<string, ExpiryBucket>();
  for (const row of rows) {
    const expiry = row.position.expiry;
    if (!expiry) continue;
    const bucket = map.get(expiry) ?? {
      expiry,
      dte: row.position.dte ?? 0,
      positions: [],
      capitalAtRisk: 0,
      theta: 0,
      pnl: 0,
    };
    bucket.positions.push(row);
    bucket.capitalAtRisk += row.capitalAtRisk;
    bucket.theta += row.greeks?.theta ?? 0;
    bucket.pnl += row.pnl;
    map.set(expiry, bucket);
  }
  return [...map.values()].sort((a, b) => a.expiry.localeCompare(b.expiry));
}

export type ConcentrationRow = {
  underlying: string;
  capitalAtRisk: number;
  share: number;
  count: number;
  delta1Pct: number;
};

export function concentration(rows: DeskPosition[]): ConcentrationRow[] {
  const total = rows.reduce((s, r) => s + r.capitalAtRisk, 0);
  const map = new Map<string, ConcentrationRow>();
  for (const row of rows) {
    const key = row.position.underlying;
    const entry = map.get(key) ?? {
      underlying: key,
      capitalAtRisk: 0,
      share: 0,
      count: 0,
      delta1Pct: 0,
    };
    entry.capitalAtRisk += row.capitalAtRisk;
    entry.count += 1;
    entry.delta1Pct += row.greeks?.delta1Pct ?? 0;
    map.set(key, entry);
  }
  return [...map.values()]
    .map((row) => ({
      ...row,
      share: total > 0 ? (row.capitalAtRisk / total) * 100 : 0,
    }))
    .sort((a, b) => b.capitalAtRisk - a.capitalAtRisk);
}

export type MonthlyPremiumRow = {
  key: string;
  label: string;
  pnl: number;
  trades: number;
};

/** Realized options P&L by exit month, oldest first. */
export function monthlyRealized(
  closed: OptionsPositionView[],
  months = 6
): MonthlyPremiumRow[] {
  const start = startOfMonth(subMonths(new Date(), months - 1));
  const rows: MonthlyPremiumRow[] = Array.from({ length: months }, (_, i) => {
    const date = startOfMonth(subMonths(new Date(), months - 1 - i));
    return { key: format(date, "yyyy-MM"), label: format(date, "MMM"), pnl: 0, trades: 0 };
  });
  for (const position of closed) {
    if (!position.exitDate) continue;
    const exit = parseISO(position.exitDate);
    if (exit < start) continue;
    const row = rows.find((r) => r.key === format(exit, "yyyy-MM"));
    if (!row) continue;
    row.pnl += position.pnl;
    row.trades += 1;
  }
  return rows;
}
