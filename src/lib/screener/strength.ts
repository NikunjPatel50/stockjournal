import {
  emptyPeriodChanges,
  SCREENER_PERIODS,
  type PeriodChanges,
} from "@/lib/screener/types";

export type ScreenerStrengthLabel =
  | "Very strong"
  | "Strong"
  | "Neutral"
  | "Weak"
  | "Very weak";

export type ScreenerStrength = {
  score: number;
  label: ScreenerStrengthLabel;
  why: string;
  reasons: string[];
};

const PERIOD_SCALE: Record<keyof PeriodChanges, number> = {
  "1d": 2.5,
  "1w": 5,
  "1m": 10,
  "3m": 18,
  "6m": 28,
  "1y": 40,
  "3y": 80,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function signedUnit(value: number | null | undefined, scale: number): number | null {
  if (value == null || !Number.isFinite(value) || scale <= 0) return null;
  return clamp(value / scale, -1, 1);
}

function mean(values: Array<number | null>): number | null {
  const nums = values.filter((value): value is number => value != null);
  if (nums.length === 0) return null;
  return nums.reduce((sum, value) => sum + value, 0) / nums.length;
}

function weightedMean(
  parts: Array<{ value: number | null; weight: number }>
): number | null {
  let sum = 0;
  let weight = 0;
  for (const part of parts) {
    if (part.value == null) continue;
    sum += part.value * part.weight;
    weight += part.weight;
  }
  if (weight === 0) return null;
  return sum / weight;
}

export function relativePeriodChanges(
  left: PeriodChanges,
  right: PeriodChanges
): PeriodChanges {
  const next = emptyPeriodChanges();
  for (const period of SCREENER_PERIODS) {
    const a = left[period];
    const b = right[period];
    next[period] =
      a != null && b != null ? Math.round((a - b) * 100) / 100 : null;
  }
  return next;
}

export function describeScreenerStrength(score: number): ScreenerStrengthLabel {
  if (score >= 80) return "Very strong";
  if (score >= 65) return "Strong";
  if (score >= 45) return "Neutral";
  if (score >= 30) return "Weak";
  return "Very weak";
}

export function computeScreenerStrength({
  changes,
  vsBenchmark,
  vsPeer,
}: {
  changes: PeriodChanges;
  vsBenchmark?: PeriodChanges | null;
  vsPeer?: PeriodChanges | null;
}): ScreenerStrength | null {
  const available = SCREENER_PERIODS.filter(
    (period) => changes[period] != null && Number.isFinite(changes[period])
  );
  if (available.length < 2) return null;

  const momentum = weightedMean([
    { value: signedUnit(changes["1w"], PERIOD_SCALE["1w"]), weight: 0.25 },
    { value: signedUnit(changes["1m"], PERIOD_SCALE["1m"]), weight: 0.45 },
    { value: signedUnit(changes["3m"], PERIOD_SCALE["3m"]), weight: 0.3 },
  ]);

  const signedPeriods = available.map((period) => changes[period] as number);
  const bullish = signedPeriods.filter((value) => value > 0.15).length;
  const bearish = signedPeriods.filter((value) => value < -0.15).length;
  const direction = (bullish - bearish) / signedPeriods.length;

  const nearTerm = [changes["1w"], changes["1m"], changes["3m"]].filter(
    (value): value is number => value != null
  );
  const alignment =
    nearTerm.length >= 2
      ? nearTerm.every((value) => value > 0)
        ? 1
        : nearTerm.every((value) => value < 0)
          ? -1
          : 0
      : 0;

  const trend = signedUnit(changes["1m"], PERIOD_SCALE["1m"]);
  const recent = mean([
    signedUnit(changes["1d"], PERIOD_SCALE["1d"]),
    signedUnit(changes["1w"], PERIOD_SCALE["1w"]),
  ]);
  let priceAction = trend ?? recent;
  if (trend != null && recent != null) {
    if (trend * recent > 0) {
      priceAction = trend * 0.6 + recent * 0.4;
    } else if (Math.abs(trend) > 0.35 && Math.abs(recent) < 0.45) {
      priceAction = trend * 0.35;
    } else {
      priceAction = recent * 0.7 + trend * 0.3;
    }
  }

  const persistence = mean([
    signedUnit(changes["6m"], PERIOD_SCALE["6m"]),
    signedUnit(changes["1y"], PERIOD_SCALE["1y"]),
  ]);

  const relative = mean([
    signedUnit(vsPeer?.["1m"], 8),
    signedUnit(vsPeer?.["3m"], 14),
    signedUnit(vsBenchmark?.["1m"], 8),
    signedUnit(vsBenchmark?.["3m"], 14),
  ]);

  const raw = weightedMean([
    { value: momentum, weight: 0.32 },
    { value: direction, weight: 0.18 },
    { value: alignment, weight: 0.1 },
    { value: priceAction, weight: 0.22 },
    { value: persistence, weight: 0.08 },
    { value: relative, weight: vsPeer || vsBenchmark ? 0.1 : 0 },
  ]);

  if (raw == null) return null;

  const score = Math.round(clamp((raw + 1) * 50, 0, 100));
  const reasons = explainScreenerStrength({
    changes,
    vsBenchmark,
    vsPeer,
    momentum,
    direction,
    alignment,
    trend,
    recent,
    persistence,
    score,
  });

  return {
    score,
    label: describeScreenerStrength(score),
    reasons,
    why: reasons.join(" · "),
  };
}

function formatPct(value: number): string {
  const abs = Math.abs(value).toFixed(1).replace(/\.0$/, "");
  if (value > 0) return `+${abs}%`;
  if (value < 0) return `-${abs}%`;
  return "0%";
}

function explainScreenerStrength({
  changes,
  vsBenchmark,
  vsPeer,
  momentum,
  direction,
  alignment,
  trend,
  recent,
  persistence,
  score,
}: {
  changes: PeriodChanges;
  vsBenchmark?: PeriodChanges | null;
  vsPeer?: PeriodChanges | null;
  momentum: number | null;
  direction: number;
  alignment: number;
  trend: number | null;
  recent: number | null;
  persistence: number | null;
  score: number;
}): string[] {
  const candidates: Array<{ text: string; weight: number; side: 1 | -1 | 0 }> = [];

  const oneMonth = changes["1m"];
  const threeMonth = changes["3m"];
  const oneWeek = changes["1w"];
  if (oneMonth != null && Math.abs(oneMonth) >= 1) {
    const extra =
      threeMonth != null && Math.abs(threeMonth) >= 2
        ? `, 3M ${formatPct(threeMonth)}`
        : "";
    candidates.push({
      text: `1M ${formatPct(oneMonth)}${extra}`,
      weight: Math.abs(momentum ?? oneMonth / 10),
      side: oneMonth > 0 ? 1 : -1,
    });
  } else if (oneWeek != null && Math.abs(oneWeek) >= 1) {
    candidates.push({
      text: `1W ${formatPct(oneWeek)}`,
      weight: Math.abs(oneWeek) / 5,
      side: oneWeek > 0 ? 1 : -1,
    });
  }

  if (alignment === 1) {
    candidates.push({ text: "1W–3M all rising", weight: 0.95, side: 1 });
  } else if (alignment === -1) {
    candidates.push({ text: "1W–3M all falling", weight: 0.95, side: -1 });
  } else if (direction > 0.35) {
    candidates.push({ text: "Most timeframes are up", weight: 0.7, side: 1 });
  } else if (direction < -0.35) {
    candidates.push({ text: "Most timeframes are down", weight: 0.7, side: -1 });
  }

  if (trend != null && recent != null) {
    if (trend > 0.2 && recent > 0.08) {
      candidates.push({
        text: "Price confirming the uptrend",
        weight: 0.72,
        side: 1,
      });
    } else if (trend < -0.2 && recent < -0.08) {
      candidates.push({
        text: "Price confirming the downtrend",
        weight: 0.72,
        side: -1,
      });
    } else if (trend > 0.35 && recent < 0 && Math.abs(recent) < 0.45) {
      candidates.push({
        text: "Pullback inside a 1M uptrend",
        weight: 0.58,
        side: 0,
      });
    } else if (trend < -0.35 && recent > 0 && recent < 0.45) {
      candidates.push({
        text: "Bounce inside a 1M downtrend",
        weight: 0.58,
        side: 0,
      });
    } else if (trend > 0.15 && recent < -0.4) {
      candidates.push({
        text: "Recent selling against the 1M trend",
        weight: 0.68,
        side: -1,
      });
    } else if (trend < -0.15 && recent > 0.4) {
      candidates.push({
        text: "Recent bounce against the 1M trend",
        weight: 0.68,
        side: 1,
      });
    }
  }

  if (persistence != null && persistence > 0.22) {
    candidates.push({ text: "6M–1Y still supportive", weight: 0.42, side: 1 });
  } else if (persistence != null && persistence < -0.22) {
    candidates.push({ text: "6M–1Y are still weak", weight: 0.42, side: -1 });
  }

  const vsNifty = vsBenchmark?.["1m"];
  if (vsNifty != null && Math.abs(vsNifty) >= 1.2) {
    candidates.push({
      text:
        vsNifty > 0
          ? `Beating Nifty by ${formatPct(vsNifty)}`
          : `Lagging Nifty by ${formatPct(Math.abs(vsNifty))}`,
      weight: Math.min(1, Math.abs(vsNifty) / 8),
      side: vsNifty > 0 ? 1 : -1,
    });
  }

  const vsSector = vsPeer?.["1m"];
  if (vsSector != null && Math.abs(vsSector) >= 1.2) {
    candidates.push({
      text:
        vsSector > 0
          ? `Beating the sector by ${formatPct(vsSector)}`
          : `Lagging the sector by ${formatPct(Math.abs(vsSector))}`,
      weight: Math.min(1, Math.abs(vsSector) / 8) + 0.05,
      side: vsSector > 0 ? 1 : -1,
    });
  }

  const preferred: 1 | -1 | 0 = score >= 65 ? 1 : score <= 35 ? -1 : 0;
  const ranked = [...candidates].sort((a, b) => {
    const aMatch = preferred === 0 || a.side === 0 || a.side === preferred ? 1 : 0;
    const bMatch = preferred === 0 || b.side === 0 || b.side === preferred ? 1 : 0;
    if (aMatch !== bMatch) return bMatch - aMatch;
    return b.weight - a.weight;
  });

  const picked: string[] = [];
  for (const item of ranked) {
    if (picked.includes(item.text)) continue;
    picked.push(item.text);
    if (picked.length === 3) break;
  }

  if (picked.length === 0) {
    return score >= 50 ? ["Mixed signals, no clear edge"] : ["No clear strength"];
  }
  return picked;
}
