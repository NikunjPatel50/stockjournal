export const EMA_QUALITY_RULES = {
  maxDebtToEquity: 0.4,
  minRoe: 0.15,
  minRoce: 0.08,
  minInsider: 0.35,
  minInstitution: 0.08,
  dailyBand: 0.03,
  weeklyBand: 0.03,
  ema200Band: 0.03,
} as const;

export type EmaTimeframe = "daily" | "weekly" | "both";

export function passesEmaTimeframe(
  timeframe: EmaTimeframe,
  dailyHolding: boolean,
  weeklyHolding: boolean
): boolean {
  if (timeframe === "daily") return dailyHolding;
  if (timeframe === "weekly") return weeklyHolding;
  return dailyHolding && weeklyHolding;
}

export function ema200TimeframeLabel(
  dailyHolding: boolean,
  weeklyHolding: boolean
): string {
  if (dailyHolding && weeklyHolding) return "Daily + weekly";
  if (dailyHolding) return "Daily";
  if (weeklyHolding) return "Weekly";
  return "—";
}
