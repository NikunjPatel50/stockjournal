export type OptionsOptionType = "Call" | "Put";
export type OptionsLegSide = "Long" | "Short";

export type OptionsTemplateId =
  | "long_call"
  | "long_put"
  | "short_call"
  | "short_put"
  | "bull_put_spread"
  | "bear_call_spread"
  | "iron_condor";

export type OptionsLegMeta = {
  id: string;
  side: OptionsLegSide;
  optionType: OptionsOptionType;
  strike: number;
  expiry: string;
  quantity: number;
  entryPremium: number;
  exitPremium: number;
};

/** Strategy-level payoff figures as shown by the broker's strategy builder. */
export type OptionsPayoffMetrics = {
  maxProfit?: number;
  maxProfitPct?: number;
  maxProfitUnlimited?: boolean;
  maxLoss?: number;
  maxLossPct?: number;
  maxLossUnlimited?: boolean;
  breakevens?: number[];
  breakevenPct?: number;
  riskReward?: number;
  pop?: number;
  fundsNeeded?: number;
  marginNeeded?: number;
};

export type OptionsTradeMeta = {
  templateId: OptionsTemplateId;
  legs: OptionsLegMeta[];
  maxRisk: number;
  ivRank?: number;
  deltaAtEntry?: number;
  payoff?: OptionsPayoffMetrics;
  spotAtEntry?: number;
  exitPlan?: OptionsExitPlanMeta;
};

export type OptionsExitPlanMeta = {
  lossMultiple: number;
  debitStopPct: number;
  profitTargetPct: number;
  /** Spread price that triggers the stop. */
  premiumStop: number;
  profitTargetPrice: number;
  underlyingStopBelow?: number;
  underlyingStopAbove?: number;
  timeStopDate: string;
};

export function hasPayoffMetrics(
  payoff: OptionsPayoffMetrics | undefined
): payoff is OptionsPayoffMetrics {
  if (!payoff) return false;
  return Object.values(payoff).some((value) =>
    Array.isArray(value) ? value.length > 0 : value != null && value !== false
  );
}
