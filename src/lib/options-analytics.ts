import { differenceInCalendarDays, format, parseISO, subDays } from "date-fns";
import type { OptionsPositionView, OptionsStrategyCategory } from "@/lib/options-journal";
import { OPTIONS_STRATEGY_FILTERS } from "@/lib/options-journal";

export type OptionsAnalyticsRange = "30d" | "3m" | "ytd" | "all";

export const OPTIONS_ANALYTICS_RANGES: { value: OptionsAnalyticsRange; label: string }[] = [
  { value: "30d", label: "30D" },
  { value: "3m", label: "3M" },
  { value: "ytd", label: "YTD" },
  { value: "all", label: "All" },
];

export type ClosedOptionsTrade = {
  position: OptionsPositionView;
  /** Still open: P&L is the live mark, not booked. */
  open: boolean;
  pnl: number;
  win: boolean;
  exit: Date;
  credit: boolean;
  dteAtEntry: number | null;
  daysHeld: number;
  /** % of broker max profit kept on a winner. */
  capture: number | null;
  /** % of broker max loss taken on a loser. */
  lossUsed: number | null;
  /** Capital the trade could lose (broker max loss, else planned risk). */
  risk: number | null;
  heldToExpiry: boolean | null;
};

export type BreakdownRow = {
  key: string;
  label: string;
  trades: number;
  wins: number;
  winRate: number;
  pnl: number;
  avg: number;
  profitFactor: number;
};

export type OptionsKpis = {
  trades: number;
  openTrades: number;
  realizedPnl: number;
  unrealizedPnl: number;
  netPnl: number;
  winRate: number;
  wins: number;
  losses: number;
  profitFactor: number;
  expectancy: number;
  avgWin: number;
  avgLoss: number;
  /** Win rate needed to break even at the current avg win / avg loss. */
  breakevenWinRate: number | null;
  maxDrawdown: number;
  /** Distance of today's equity below its peak (0 at a new high). */
  currentDrawdown: number;
  largestWin: number;
  largestLoss: number;
  returnOnRisk: number | null;
  avgCapture: number | null;
  avgDaysHeld: number;
  avgDteAtEntry: number | null;
};

export type EquityPoint = {
  key: string;
  label: string;
  pnl: number;
  equity: number;
  drawdown: number;
};

export type Insight = {
  tone: "positive" | "negative" | "neutral";
  title: string;
  detail: string;
};

export type EdgeVerdict = {
  label: "Strong edge" | "Positive edge" | "Break-even" | "Negative edge" | "Not enough data";
  tone: "positive" | "negative" | "neutral";
};

const DTE_BUCKETS: { key: string; label: string; min: number; max: number }[] = [
  { key: "0-3", label: "0–3 Days", min: 0, max: 3 },
  { key: "4-7", label: "4–7 Days", min: 4, max: 7 },
  { key: "8-21", label: "8–21 Days", min: 8, max: 21 },
  { key: "22-45", label: "22–45 Days", min: 22, max: 45 },
  { key: "46+", label: "46+ Days", min: 46, max: Infinity },
];

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

function rangeStart(range: OptionsAnalyticsRange, now: Date): Date | null {
  if (range === "all") return null;
  if (range === "30d") return subDays(now, 30);
  if (range === "3m") return subDays(now, 90);
  return new Date(now.getFullYear(), 0, 1);
}

function toAnalyticsTrade(
  position: OptionsPositionView,
  openMark: { pnl: number; now: Date } | null
): ClosedOptionsTrade {
  const trade = position.source;
  const entry = parseISO(position.entryDate);
  const exit = openMark ? openMark.now : parseISO(position.exitDate || position.entryDate);
  const payoff = trade.optionsMeta?.payoff;
  const maxProfit =
    payoff?.maxProfit != null && !payoff.maxProfitUnlimited && payoff.maxProfit > 0
      ? payoff.maxProfit
      : null;
  const maxLoss =
    payoff?.maxLoss != null && !payoff.maxLossUnlimited && Math.abs(payoff.maxLoss) > 0
      ? Math.abs(payoff.maxLoss)
      : null;
  const risk = maxLoss ?? (position.maxRisk && position.maxRisk > 0 ? position.maxRisk : null);
  const expiry = position.expiry ? parseISO(position.expiry) : null;
  const pnl = openMark ? openMark.pnl : position.pnl;

  return {
    position,
    open: openMark != null,
    pnl,
    win: pnl > 0,
    exit,
    credit: position.direction === "Short",
    dteAtEntry: expiry ? Math.max(0, differenceInCalendarDays(expiry, entry)) : null,
    daysHeld: Math.max(0, differenceInCalendarDays(exit, entry)),
    capture: pnl > 0 && maxProfit ? Math.min(100, (pnl / maxProfit) * 100) : null,
    lossUsed: pnl < 0 && maxLoss ? Math.min(100, (Math.abs(pnl) / maxLoss) * 100) : null,
    risk,
    heldToExpiry:
      openMark || !expiry ? null : differenceInCalendarDays(expiry, exit) <= 0,
  };
}

function breakdown(
  trades: ClosedOptionsTrade[],
  keyOf: (t: ClosedOptionsTrade) => { key: string; label: string } | null,
  order?: string[]
): BreakdownRow[] {
  const map = new Map<string, { label: string; list: ClosedOptionsTrade[] }>();
  for (const t of trades) {
    const k = keyOf(t);
    if (!k) continue;
    const entry = map.get(k.key) ?? { label: k.label, list: [] };
    entry.list.push(t);
    map.set(k.key, entry);
  }
  const rows = [...map.entries()].map(([key, { label, list }]) => {
    const wins = list.filter((t) => t.win).length;
    const gross = list.filter((t) => t.pnl > 0).reduce((s, t) => s + t.pnl, 0);
    const loss = Math.abs(list.filter((t) => t.pnl < 0).reduce((s, t) => s + t.pnl, 0));
    const pnl = list.reduce((s, t) => s + t.pnl, 0);
    return {
      key,
      label,
      trades: list.length,
      wins,
      winRate: (wins / list.length) * 100,
      pnl,
      avg: pnl / list.length,
      profitFactor: loss === 0 ? (gross > 0 ? Infinity : 0) : gross / loss,
    };
  });
  if (order) {
    return rows.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
  }
  return rows.sort((a, b) => b.pnl - a.pnl);
}

function computeKpis(trades: ClosedOptionsTrade[], equity: EquityPoint[]): OptionsKpis {
  const winners = trades.filter((t) => t.pnl > 0);
  const losers = trades.filter((t) => t.pnl < 0);
  const gross = winners.reduce((s, t) => s + t.pnl, 0);
  const loss = Math.abs(losers.reduce((s, t) => s + t.pnl, 0));
  const netPnl = trades.reduce((s, t) => s + t.pnl, 0);
  const avgWin = winners.length ? gross / winners.length : 0;
  const avgLoss = losers.length ? loss / losers.length : 0;
  const withRisk = trades.filter((t) => t.risk != null);
  const riskSum = withRisk.reduce((s, t) => s + (t.risk ?? 0), 0);
  const captures = trades.map((t) => t.capture).filter((c): c is number => c != null);
  const dtes = trades.map((t) => t.dteAtEntry).filter((d): d is number => d != null);

  const openList = trades.filter((t) => t.open);
  const unrealizedPnl = openList.reduce((s, t) => s + t.pnl, 0);

  return {
    trades: trades.length,
    openTrades: openList.length,
    realizedPnl: netPnl - unrealizedPnl,
    unrealizedPnl,
    netPnl,
    winRate: trades.length ? (winners.length / trades.length) * 100 : 0,
    wins: winners.length,
    losses: losers.length,
    profitFactor: loss === 0 ? (gross > 0 ? Infinity : 0) : gross / loss,
    expectancy: trades.length ? netPnl / trades.length : 0,
    avgWin,
    avgLoss,
    breakevenWinRate:
      avgWin > 0 && avgLoss > 0 ? (avgLoss / (avgWin + avgLoss)) * 100 : null,
    maxDrawdown: equity.reduce((m, p) => Math.min(m, p.drawdown), 0),
    largestWin: winners.reduce((m, t) => Math.max(m, t.pnl), 0),
    currentDrawdown: equity[equity.length - 1]?.drawdown ?? 0,
    largestLoss: losers.reduce((m, t) => Math.min(m, t.pnl), 0),
    returnOnRisk:
      riskSum > 0 ? (withRisk.reduce((s, t) => s + t.pnl, 0) / riskSum) * 100 : null,
    avgCapture: captures.length
      ? captures.reduce((a, b) => a + b, 0) / captures.length
      : null,
    avgDaysHeld: trades.length
      ? trades.reduce((s, t) => s + t.daysHeld, 0) / trades.length
      : 0,
    avgDteAtEntry: dtes.length ? dtes.reduce((a, b) => a + b, 0) / dtes.length : null,
  };
}

function equityCurve(trades: ClosedOptionsTrade[]): EquityPoint[] {
  const byDay = new Map<string, number>();
  for (const t of [...trades].sort((a, b) => a.exit.getTime() - b.exit.getTime())) {
    const key = format(t.exit, "yyyy-MM-dd");
    byDay.set(key, (byDay.get(key) ?? 0) + t.pnl);
  }
  let equity = 0;
  let peak = 0;
  return [...byDay.entries()].map(([key, pnl]) => {
    equity += pnl;
    peak = Math.max(peak, equity);
    return {
      key,
      label: format(parseISO(key), "d MMM"),
      pnl,
      equity,
      drawdown: equity - peak,
    };
  });
}

export function edgeVerdict(kpis: OptionsKpis): EdgeVerdict {
  if (kpis.trades < 3) return { label: "Not enough data", tone: "neutral" };
  if (kpis.profitFactor >= 2) return { label: "Strong edge", tone: "positive" };
  if (kpis.profitFactor >= 1.2) return { label: "Positive edge", tone: "positive" };
  if (kpis.profitFactor >= 0.9) return { label: "Break-even", tone: "neutral" };
  return { label: "Negative edge", tone: "negative" };
}

function pct(value: number) {
  return `${Math.round(value)}%`;
}

function buildInsights(
  kpis: OptionsKpis,
  byStrategy: BreakdownRow[],
  byStyle: BreakdownRow[],
  byDte: BreakdownRow[],
  byUnderlying: BreakdownRow[],
  money: (v: number) => string
): Insight[] {
  const out: Insight[] = [];
  if (kpis.trades === 0) return out;

  const best = byStrategy[0];
  if (best && best.pnl > 0) {
    out.push({
      tone: "positive",
      title: `Your edge: ${best.label.toLowerCase()}`,
      detail: `${money(best.pnl)} from ${best.trades} trade${best.trades === 1 ? "" : "s"} at a ${pct(best.winRate)} win rate.`,
    });
  }

  const worst = byStrategy[byStrategy.length - 1];
  if (worst && worst.pnl < 0 && worst.key !== best?.key) {
    out.push({
      tone: "negative",
      title: `Costing you: ${worst.label.toLowerCase()}`,
      detail: `${money(worst.pnl)} across ${worst.trades} trade${worst.trades === 1 ? "" : "s"}. Size down or review the setup.`,
    });
  }

  if (kpis.breakevenWinRate != null) {
    const cushion = kpis.winRate - kpis.breakevenWinRate;
    out.push({
      tone: cushion >= 5 ? "positive" : cushion >= 0 ? "neutral" : "negative",
      title:
        cushion >= 0
          ? `Win rate is ${Math.round(cushion)} pts above break-even`
          : `Win rate is ${Math.round(-cushion)} pts below break-even`,
      detail: `Your average loss is ${(kpis.avgLoss / kpis.avgWin).toFixed(1)}× your average win, so you need ${pct(kpis.breakevenWinRate)} winners to break even. You are at ${pct(kpis.winRate)}.`,
    });
  }

  const credit = byStyle.find((r) => r.key === "credit");
  const debit = byStyle.find((r) => r.key === "debit");
  if (credit && debit) {
    const better = credit.pnl >= debit.pnl ? credit : debit;
    const worse = better === credit ? debit : credit;
    out.push({
      tone: "neutral",
      title: `${better.label} beat ${worse.label.toLowerCase()}`,
      detail: `${money(better.pnl)} vs ${money(worse.pnl)}, with win rates of ${pct(better.winRate)} and ${pct(worse.winRate)}.`,
    });
  }

  const dteBest = [...byDte].sort((a, b) => b.avg - a.avg)[0];
  if (dteBest && byDte.length > 1 && dteBest.pnl > 0) {
    out.push({
      tone: "positive",
      title: `Best results at ${dteBest.label} to expiry`,
      detail: `${money(dteBest.avg)} per trade on average when entered with ${dteBest.label} left.`,
    });
  }

  const topName = byUnderlying[0];
  if (topName && topName.pnl > 0 && byUnderlying.length > 1) {
    out.push({
      tone: "positive",
      title: `${topName.label} is your best underlying`,
      detail: `${money(topName.pnl)} from ${topName.trades} trade${topName.trades === 1 ? "" : "s"}.`,
    });
  }

  if (kpis.avgCapture != null) {
    out.push({
      tone: "neutral",
      title: `You keep ${pct(kpis.avgCapture)} of max profit on winners`,
      detail:
        kpis.avgCapture < 40
          ? "Winners are closed early. That cuts risk but also caps your edge."
          : "You are letting winners work toward their full potential.",
    });
  }

  return out.slice(0, 5);
}

export type OptionsAnalytics = {
  trades: ClosedOptionsTrade[];
  kpis: OptionsKpis;
  equity: EquityPoint[];
  byStrategy: BreakdownRow[];
  byStyle: BreakdownRow[];
  byDte: BreakdownRow[];
  byUnderlying: BreakdownRow[];
  byWeekday: BreakdownRow[];
  management: {
    early: BreakdownRow | null;
    expiry: BreakdownRow | null;
  };
  captureBuckets: { label: string; count: number }[];
  insights: Insight[];
  verdict: EdgeVerdict;
};

const STRATEGY_LABEL = new Map<OptionsStrategyCategory, string>(
  OPTIONS_STRATEGY_FILTERS.map((f) => [f.value, f.label])
);

export function buildOptionsAnalytics(
  positions: OptionsPositionView[],
  range: OptionsAnalyticsRange,
  money: (v: number) => string,
  /** Live P&L for open positions; omit to analyse closed trades only. */
  openPnl: ((position: OptionsPositionView) => number) | null,
  now = new Date()
): OptionsAnalytics {
  const start = rangeStart(range, now);
  const trades = positions
    .filter((p) => p.status !== "Open" || openPnl != null)
    .map((p) =>
      toAnalyticsTrade(
        p,
        p.status === "Open" && openPnl ? { pnl: openPnl(p), now } : null
      )
    )
    .filter((t) => !start || t.exit >= start);

  const equity = equityCurve(trades);
  const kpis = computeKpis(trades, equity);

  const byStrategy = breakdown(trades, (t) => ({
    key: t.position.strategyCategory,
    label: STRATEGY_LABEL.get(t.position.strategyCategory) ?? "Other",
  }));
  const byStyle = breakdown(trades, (t) =>
    t.credit
      ? { key: "credit", label: "Credit Trades" }
      : { key: "debit", label: "Debit Trades" }
  );
  const byDte = breakdown(
    trades,
    (t) => {
      if (t.dteAtEntry == null) return null;
      const b = DTE_BUCKETS.find((x) => t.dteAtEntry! >= x.min && t.dteAtEntry! <= x.max);
      return b ? { key: b.key, label: b.label } : null;
    },
    DTE_BUCKETS.map((b) => b.key)
  );
  const byUnderlying = breakdown(trades, (t) => ({
    key: t.position.underlying,
    label: t.position.underlying,
  }));
  const byWeekday = breakdown(
    trades,
    (t) => {
      const day = parseISO(t.position.entryDate).getDay();
      if (day === 0 || day === 6) return null;
      return { key: WEEKDAYS[day - 1], label: WEEKDAYS[day - 1] };
    },
    WEEKDAYS
  );
  const mgmt = breakdown(trades, (t) =>
    t.heldToExpiry == null
      ? null
      : t.heldToExpiry
        ? { key: "expiry", label: "Held To Expiry" }
        : { key: "early", label: "Closed Early" }
  );

  const captureBuckets = [
    { label: "<25%", min: 0, max: 25 },
    { label: "25–50%", min: 25, max: 50 },
    { label: "50–75%", min: 50, max: 75 },
    { label: "75%+", min: 75, max: 101 },
  ].map((b) => ({
    label: b.label,
    count: trades.filter((t) => t.capture != null && t.capture >= b.min && t.capture < b.max)
      .length,
  }));

  return {
    trades,
    kpis,
    equity,
    byStrategy,
    byStyle,
    byDte,
    byUnderlying,
    byWeekday,
    management: {
      early: mgmt.find((r) => r.key === "early") ?? null,
      expiry: mgmt.find((r) => r.key === "expiry") ?? null,
    },
    captureBuckets,
    insights: buildInsights(kpis, byStrategy, byStyle, byDte, byUnderlying, money),
    verdict: edgeVerdict(kpis),
  };
}
