import {
  computeKpis,
  computeWeeklyPnl,
  type AnalyticsKpis,
} from "@/lib/analytics";
import type { JournalTrade } from "@/lib/journal-types";

export type PerformanceDimensionId =
  | "winRate"
  | "riskReward"
  | "consistency"
  | "maxDrawdown"
  | "profitability"
  | "recovery";

export type PerformanceDimension = {
  id: PerformanceDimensionId;
  label: string;
  score: number;
  hint: string;
};

export type PerformanceRatingTier =
  | "Beginner"
  | "Developing"
  | "Intermediate"
  | "Advanced"
  | "Elite";

export type AiPerformanceRating = {
  overallScore: number;
  tier: PerformanceRatingTier;
  dimensions: PerformanceDimension[];
  tips: string[];
  tradeCount: number;
  insufficientData: boolean;
};

const DIMENSION_META: Record<
  PerformanceDimensionId,
  { label: string; hint: string }
> = {
  winRate: {
    label: "Win Rate",
    hint: "Share of closed trades with positive realized P&L in the selected period.",
  },
  riskReward: {
    label: "Risk/Reward",
    hint: "Average planned or realized reward relative to risk across closed trades.",
  },
  consistency: {
    label: "Consistency",
    hint: "How often your trading weeks finish positive — steadier results score higher.",
  },
  maxDrawdown: {
    label: "Max Drawdown",
    hint: "Depth of the largest peak-to-trough equity dip; shallower drawdowns score higher.",
  },
  profitability: {
    label: "Profitability",
    hint: "Combines net return on capital and profit factor for the period.",
  },
  recovery: {
    label: "Recovery",
    hint: "How well net profits offset your worst equity drawdown (recovery factor).",
  },
};

function clampScore(value: number): number {
  return Math.round(Math.max(0, Math.min(100, value)));
}

function parseAvgRiskRewardRatio(kpis: AnalyticsKpis, trades: JournalTrade[]): number {
  const match = kpis.avgRr.match(/([\d.]+)\s*:\s*([\d.]+)/);
  if (match) {
    const risk = Number(match[1]);
    const reward = Number(match[2]);
    if (risk > 0 && reward > 0) return reward / risk;
  }

  let sum = 0;
  let count = 0;
  for (const trade of trades) {
    const rr = trade.riskReward?.match(/([\d.]+)\s*:\s*([\d.]+)/);
    if (!rr) continue;
    const a = Number(rr[1]);
    const b = Number(rr[2]);
    if (!a || !b) continue;
    sum += b / a;
    count += 1;
  }
  return count ? sum / count : 0;
}

function scoreWinRate(kpis: AnalyticsKpis): number {
  return clampScore(kpis.winRate);
}

function scoreRiskReward(ratio: number): number {
  if (ratio <= 0) return 35;
  if (ratio < 1) return clampScore(30 + ratio * 25);
  if (ratio < 2) return clampScore(55 + (ratio - 1) * 30);
  return clampScore(85 + (ratio - 2) * 7.5);
}

function scoreConsistency(trades: JournalTrade[]): number {
  const weekly = computeWeeklyPnl(trades);
  if (weekly.length === 0) return 0;
  if (weekly.length === 1) return weekly[0].pnl > 0 ? 70 : 30;

  const positiveWeeks = weekly.filter((w) => w.pnl > 0).length;
  const weekRate = positiveWeeks / weekly.length;

  const pnls = trades.map((t) => t.pnl);
  const mean = pnls.reduce((s, v) => s + v, 0) / pnls.length;
  const variance =
    pnls.reduce((s, v) => s + (v - mean) ** 2, 0) / Math.max(1, pnls.length - 1);
  const std = Math.sqrt(variance);
  const meanAbs = Math.abs(mean);
  const volatilityPenalty =
    meanAbs > 0 ? Math.min(25, (std / meanAbs) * 12) : Math.min(25, std / 100);

  return clampScore(weekRate * 100 - volatilityPenalty);
}

function scoreMaxDrawdown(kpis: AnalyticsKpis): number {
  const pct = Math.abs(kpis.maxDrawdownPct);
  return clampScore(100 - pct * 2.2);
}

function scoreProfitability(kpis: AnalyticsKpis): number {
  const returnScore = clampScore(50 + kpis.returnPct * 4);
  const pf =
    kpis.profitFactor === Infinity
      ? 3
      : Number.isFinite(kpis.profitFactor)
        ? kpis.profitFactor
        : 0;
  const pfScore = clampScore(pf * 42);
  const netBonus = kpis.netPnl > 0 ? 8 : kpis.netPnl < 0 ? -12 : 0;
  return clampScore(returnScore * 0.45 + pfScore * 0.55 + netBonus);
}

function scoreRecovery(kpis: AnalyticsKpis): number {
  const dd = Math.abs(kpis.maxDrawdown);
  if (dd < 1) {
    return kpis.netPnl > 0 ? 88 : kpis.netPnl < 0 ? 42 : 55;
  }
  const factor = kpis.netPnl / dd;
  return clampScore(52 + factor * 22);
}

function tierForScore(score: number): PerformanceRatingTier {
  if (score >= 85) return "Elite";
  if (score >= 70) return "Advanced";
  if (score >= 55) return "Intermediate";
  if (score >= 40) return "Developing";
  return "Beginner";
}

function buildTips(dimensions: PerformanceDimension[]): string[] {
  const sorted = [...dimensions].sort((a, b) => a.score - b.score);
  const weakest = sorted[0];
  const second = sorted[1];
  const strongest = sorted[sorted.length - 1];

  const tips: string[] = [];

  if (weakest.id === "maxDrawdown") {
    tips.push("Reduce risk per trade to limit your peak-to-trough drawdown");
  } else if (weakest.id === "winRate") {
    tips.push("Work on your entry timing and setup selection");
  } else if (weakest.id === "riskReward") {
    tips.push("Aim for at least 1:2 planned R:R so winners can pay for losers");
  } else if (weakest.id === "consistency") {
    tips.push("Trade fewer, higher-quality setups to smooth week-to-week results");
  } else if (weakest.id === "profitability") {
    tips.push("Review whether position size and hold time match your best setups");
  } else if (weakest.id === "recovery") {
    tips.push("Let winners run and cut losses quickly to rebuild equity after dips");
  }

  if (second && second.score < 60) {
    if (second.id === "winRate") {
      tips.push("Tag trades by setup type and drop patterns with poor win rates");
    } else if (second.id === "maxDrawdown") {
      tips.push("Cap daily or weekly loss limits before adding new risk");
    } else {
      tips.push(`Strengthen ${second.label.toLowerCase()} — it is your next bottleneck`);
    }
  }

  if (strongest.score >= 75) {
    tips.push(
      "Solid trading! Focus on your weakest dimension to reach elite status"
    );
  } else if (tips.length < 3) {
    tips.push("Log planned stop and target on every trade so analytics stay honest");
  }

  return tips.slice(0, 3);
}

export function computeAiPerformanceRating(
  trades: JournalTrade[],
  startingEquity: number,
  minTrades = 5
): AiPerformanceRating {
  const tradeCount = trades.length;
  if (tradeCount < minTrades) {
    return {
      overallScore: 0,
      tier: "Beginner",
      dimensions: Object.keys(DIMENSION_META).map((id) => ({
        id: id as PerformanceDimensionId,
        label: DIMENSION_META[id as PerformanceDimensionId].label,
        score: 0,
        hint: DIMENSION_META[id as PerformanceDimensionId].hint,
      })),
      tips: [
        "Close at least five trades in this period to unlock your performance rating",
      ],
      tradeCount,
      insufficientData: true,
    };
  }

  const kpis = computeKpis(trades, startingEquity);
  const rrRatio = parseAvgRiskRewardRatio(kpis, trades);

  const scores: Record<PerformanceDimensionId, number> = {
    winRate: scoreWinRate(kpis),
    riskReward: scoreRiskReward(rrRatio),
    consistency: scoreConsistency(trades),
    maxDrawdown: scoreMaxDrawdown(kpis),
    profitability: scoreProfitability(kpis),
    recovery: scoreRecovery(kpis),
  };

  const dimensions: PerformanceDimension[] = (
    Object.keys(DIMENSION_META) as PerformanceDimensionId[]
  ).map((id) => ({
    id,
    label: DIMENSION_META[id].label,
    score: scores[id],
    hint: DIMENSION_META[id].hint,
  }));

  const overallScore = clampScore(
    dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length
  );

  return {
    overallScore,
    tier: tierForScore(overallScore),
    dimensions,
    tips: buildTips(dimensions),
    tradeCount,
    insufficientData: false,
  };
}

/** Radar chart row shape for Recharts */
export function ratingToRadarData(dimensions: PerformanceDimension[]) {
  return dimensions.map((d) => ({
    dimension: d.label,
    score: d.score,
    fullMark: 100,
  }));
}
