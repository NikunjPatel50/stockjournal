import type { JournalDirection } from "@/lib/journal-types";

export type SmartPositionInput = {
  entryPrice: number;
  capital: number;
  riskReward: string;
  direction: JournalDirection;
  /** Stop distance as % of entry (e.g. 2 = 2% below entry for longs). */
  stopPercent?: number;
  /** Absolute stop loss price; takes precedence over stopPercent when set. */
  stopLossPrice?: number;
};

export type AccountRiskPositionInput = {
  entryPrice: number;
  accountEquity: number;
  /** Used for % risk when realized equity is zero or negative. */
  startingBalance?: number;
  maxRiskMode: "percent" | "fixed";
  maxRiskValue: number;
  riskReward: string;
  direction: JournalDirection;
  stopPercent?: number;
};

export function resolveAccountRiskBase(input: {
  accountEquity: number;
  startingBalance?: number;
}): { base: number; usesStartingBalanceFallback: boolean } | { error: string } {
  if (input.accountEquity > 0) {
    return { base: input.accountEquity, usesStartingBalanceFallback: false };
  }

  const fallback = input.startingBalance ?? 0;
  if (fallback > 0) {
    return { base: fallback, usesStartingBalanceFallback: true };
  }

  return {
    error:
      "Account equity is negative — set total money invested in Settings to size by % risk.",
  };
}

export type AtrLevelsInput = {
  entryPrice: number;
  atr14: number;
  stopAtrMultiple: number;
  targetAtrMultiple: number;
  direction: JournalDirection;
};

export type SmartPositionResult = {
  entryPrice: number;
  quantity: number;
  stopLoss: number;
  profitTarget: number;
  riskPerShare: number;
  rewardPerShare: number;
  positionValue: number;
  maxLoss: number;
  maxProfit: number;
  riskRewardLabel: string;
};

export type PlannedRPreview = {
  riskPerShare: number;
  rewardPerShare: number;
  plannedRisk: number;
  maxProfit: number;
  rMultiple: number | null;
  riskRewardLabel: string;
};

export function parseRiskRewardRatio(value: string): {
  risk: number;
  reward: number;
} | null {
  const cleaned = value.trim().replace(/\s/g, "");
  const match = cleaned.match(/^(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const risk = Number(match[1]);
  const reward = Number(match[2]);
  if (!Number.isFinite(risk) || !Number.isFinite(reward) || risk <= 0 || reward <= 0) {
    return null;
  }
  return { risk, reward };
}

function roundMoney(n: number, decimals = 2) {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

function buildLevelsFromStopDistance(
  entryPrice: number,
  stopDistance: number,
  riskReward: string,
  direction: JournalDirection,
  quantity: number
): SmartPositionResult | { error: string } {
  const rr = parseRiskRewardRatio(riskReward);
  if (!rr) {
    return { error: "Use risk:reward format like 1:2." };
  }
  if (stopDistance <= 0) {
    return { error: "Stop distance must be positive." };
  }

  const rewardDistance = stopDistance * (rr.reward / rr.risk);

  let stopLoss: number;
  let profitTarget: number;

  if (direction === "Short") {
    stopLoss = entryPrice + stopDistance;
    profitTarget = entryPrice - rewardDistance;
  } else {
    stopLoss = entryPrice - stopDistance;
    profitTarget = entryPrice + rewardDistance;
  }

  if (stopLoss <= 0 || profitTarget <= 0) {
    return { error: "Adjust levels — stop and target must stay positive." };
  }

  const riskPerShare = roundMoney(Math.abs(entryPrice - stopLoss));
  const rewardPerShare = roundMoney(Math.abs(profitTarget - entryPrice));
  const positionValue = roundMoney(entryPrice * quantity);
  const maxLoss = roundMoney(riskPerShare * quantity);
  const maxProfit = roundMoney(rewardPerShare * quantity);

  return {
    entryPrice: roundMoney(entryPrice),
    quantity,
    stopLoss: roundMoney(stopLoss),
    profitTarget: roundMoney(profitTarget),
    riskPerShare,
    rewardPerShare,
    positionValue,
    maxLoss,
    maxProfit,
    riskRewardLabel: `${rr.risk}:${rr.reward}`,
  };
}

function resolveStopDistance(
  entryPrice: number,
  direction: JournalDirection,
  input: { stopPercent?: number; stopLossPrice?: number }
): number | { error: string } {
  const hasStopPrice =
    input.stopLossPrice != null &&
    Number.isFinite(input.stopLossPrice) &&
    input.stopLossPrice > 0;

  if (hasStopPrice) {
    const stopLoss = input.stopLossPrice!;
    if (direction === "Short") {
      if (stopLoss <= entryPrice) {
        return { error: "Stop loss must be above entry for short trades." };
      }
      return stopLoss - entryPrice;
    }
    if (stopLoss >= entryPrice) {
      return { error: "Stop loss must be below entry for long trades." };
    }
    return entryPrice - stopLoss;
  }

  const stopPercent = input.stopPercent ?? 2;
  if (stopPercent <= 0 || stopPercent >= 100) {
    return { error: "Stop % must be between 0 and 100." };
  }
  return entryPrice * (stopPercent / 100);
}

/** Default stop distance when deriving levels in Smart Setup (% of entry). */
export const SMART_SETUP_DEFAULT_STOP_PERCENT = 2;

export function computeStopLossPriceFromPercent(input: {
  entryPrice: number;
  stopPercent: number;
  direction: JournalDirection;
}): number | null {
  const { entryPrice, stopPercent, direction } = input;
  if (
    !Number.isFinite(entryPrice) ||
    entryPrice <= 0 ||
    !Number.isFinite(stopPercent) ||
    stopPercent <= 0 ||
    stopPercent >= 100
  ) {
    return null;
  }

  const distance = entryPrice * (stopPercent / 100);
  const stopLoss =
    direction === "Short" ? entryPrice + distance : entryPrice - distance;

  if (stopLoss <= 0) return null;
  return roundMoney(stopLoss);
}

function roundDisplay(n: number, decimals = 2) {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

/** Stop distance as % of entry, derived from absolute stop price. */
export function computeStopPercentFromPrice(input: {
  entryPrice: number;
  stopLossPrice: number;
  direction: JournalDirection;
}): number | null {
  const { entryPrice, stopLossPrice, direction } = input;
  if (
    !Number.isFinite(entryPrice) ||
    entryPrice <= 0 ||
    !Number.isFinite(stopLossPrice) ||
    stopLossPrice <= 0
  ) {
    return null;
  }

  if (direction === "Short") {
    if (stopLossPrice <= entryPrice) return null;
    return roundDisplay(((stopLossPrice - entryPrice) / entryPrice) * 100);
  }

  if (stopLossPrice >= entryPrice) return null;
  return roundDisplay(((entryPrice - stopLossPrice) / entryPrice) * 100);
}

/** Target price from entry, stop, and risk:reward (no sizing). */
export function computeTargetProfitPrice(input: {
  entryPrice: number;
  stopLossPrice: number;
  riskReward: string;
  direction: JournalDirection;
}): number | { error: string } {
  const { entryPrice, stopLossPrice, riskReward, direction } = input;
  const stopDistance = resolveStopDistance(entryPrice, direction, {
    stopLossPrice,
  });
  if (typeof stopDistance !== "number") return stopDistance;

  const rr = parseRiskRewardRatio(riskReward);
  if (!rr) return { error: "Use risk:reward format like 1:2." };

  const rewardDistance = stopDistance * (rr.reward / rr.risk);
  const profitTarget =
    direction === "Short"
      ? entryPrice - rewardDistance
      : entryPrice + rewardDistance;

  if (profitTarget <= 0) {
    return { error: "Target must stay positive." };
  }

  return roundMoney(profitTarget);
}

export function computeSmartPosition(
  input: SmartPositionInput
): SmartPositionResult | { error: string } {
  const entryPrice = input.entryPrice;
  const capital = input.capital;

  if (!Number.isFinite(entryPrice) || entryPrice <= 0) {
    return { error: "Enter a valid stock price." };
  }
  if (!Number.isFinite(capital) || capital <= 0) {
    return { error: "Enter capital to invest." };
  }

  const stopDistance = resolveStopDistance(entryPrice, input.direction, {
    stopPercent: input.stopPercent,
    stopLossPrice: input.stopLossPrice,
  });
  if (typeof stopDistance !== "number") {
    return stopDistance;
  }

  const rawQty = Math.floor(capital / entryPrice);
  if (rawQty < 1) {
    return {
      error: `Capital must cover at least one share at ${entryPrice.toFixed(2)}.`,
    };
  }

  return buildLevelsFromStopDistance(
    entryPrice,
    stopDistance,
    input.riskReward,
    input.direction,
    rawQty
  );
}

/** Size from capital using explicit stop and target prices (Risk Calculator). */
export function computeSmartPositionFromLevels(input: {
  entryPrice: number;
  capital: number;
  stopLossPrice: number;
  profitTarget: number;
  direction: JournalDirection;
}): SmartPositionResult | { error: string } {
  const { entryPrice, capital, stopLossPrice, profitTarget, direction } = input;

  if (!Number.isFinite(entryPrice) || entryPrice <= 0) {
    return { error: "Enter a valid stock price." };
  }
  if (!Number.isFinite(capital) || capital <= 0) {
    return { error: "Enter capital to invest." };
  }
  if (!Number.isFinite(stopLossPrice) || stopLossPrice <= 0) {
    return { error: "Enter a valid stop loss price." };
  }
  if (!Number.isFinite(profitTarget) || profitTarget <= 0) {
    return { error: "Enter a valid target price." };
  }

  const stopDistance = resolveStopDistance(entryPrice, direction, {
    stopLossPrice,
  });
  if (typeof stopDistance !== "number") {
    return stopDistance;
  }

  const isValidLong =
    direction === "Long" &&
    stopLossPrice < entryPrice &&
    profitTarget > entryPrice;
  const isValidShort =
    direction === "Short" &&
    stopLossPrice > entryPrice &&
    profitTarget < entryPrice;

  if (!isValidLong && !isValidShort) {
    return {
      error:
        direction === "Long"
          ? "For longs, stop must be below entry and target above entry."
          : "For shorts, stop must be above entry and target below entry.",
    };
  }

  const rawQty = Math.floor(capital / entryPrice);
  if (rawQty < 1) {
    return {
      error: `Capital must cover at least one share at ${entryPrice.toFixed(2)}.`,
    };
  }

  const riskPerShare = roundMoney(Math.abs(entryPrice - stopLossPrice));
  const rewardPerShare = roundMoney(Math.abs(profitTarget - entryPrice));
  const positionValue = roundMoney(entryPrice * rawQty);
  const maxLoss = roundMoney(riskPerShare * rawQty);
  const maxProfit = roundMoney(rewardPerShare * rawQty);
  const rMultiple =
    riskPerShare > 0 ? rewardPerShare / riskPerShare : 0;

  return {
    entryPrice: roundMoney(entryPrice),
    quantity: rawQty,
    stopLoss: roundMoney(stopLossPrice),
    profitTarget: roundMoney(profitTarget),
    riskPerShare,
    rewardPerShare,
    positionValue,
    maxLoss,
    maxProfit,
    riskRewardLabel: `1:${rMultiple.toFixed(1)}`,
  };
}

export function computeAccountRiskPosition(
  input: AccountRiskPositionInput
): SmartPositionResult | { error: string } {
  const entryPrice = input.entryPrice;
  const stopPercent = input.stopPercent ?? 2;

  if (!Number.isFinite(entryPrice) || entryPrice <= 0) {
    return { error: "Enter a valid stock price." };
  }
  if (!Number.isFinite(input.maxRiskValue) || input.maxRiskValue <= 0) {
    return { error: "Enter a valid risk amount." };
  }
  if (stopPercent <= 0 || stopPercent >= 100) {
    return { error: "Stop % must be between 0 and 100." };
  }

  let riskBudget: number;
  if (input.maxRiskMode === "fixed") {
    riskBudget = input.maxRiskValue;
  } else {
    const base = resolveAccountRiskBase({
      accountEquity: input.accountEquity,
      startingBalance: input.startingBalance,
    });
    if ("error" in base) return base;
    riskBudget = base.base * (input.maxRiskValue / 100);
  }

  const stopDistance = entryPrice * (stopPercent / 100);
  const riskPerShare = stopDistance;
  const quantity = Math.floor(riskBudget / riskPerShare);

  if (quantity < 1) {
    return {
      error: `Risk budget (${riskBudget.toFixed(0)}) is too small for this stop distance.`,
    };
  }

  return buildLevelsFromStopDistance(
    entryPrice,
    stopDistance,
    input.riskReward,
    input.direction,
    quantity
  );
}

export function computeAtrLevels(
  input: AtrLevelsInput
): SmartPositionResult | { error: string } {
  const { entryPrice, atr14, stopAtrMultiple, targetAtrMultiple, direction } =
    input;

  if (!Number.isFinite(entryPrice) || entryPrice <= 0) {
    return { error: "Enter a valid entry price." };
  }
  if (!Number.isFinite(atr14) || atr14 <= 0) {
    return { error: "ATR data is not available." };
  }
  if (stopAtrMultiple <= 0 || targetAtrMultiple <= 0) {
    return { error: "ATR multiples must be positive." };
  }

  const stopDistance = atr14 * stopAtrMultiple;
  const rewardDistance = atr14 * targetAtrMultiple;

  let stopLoss: number;
  let profitTarget: number;

  if (direction === "Short") {
    stopLoss = entryPrice + stopDistance;
    profitTarget = entryPrice - rewardDistance;
  } else {
    stopLoss = entryPrice - stopDistance;
    profitTarget = entryPrice + rewardDistance;
  }

  if (stopLoss <= 0 || profitTarget <= 0) {
    return { error: "ATR levels must stay positive — adjust multiples." };
  }

  const riskPerShare = roundMoney(Math.abs(entryPrice - stopLoss));
  const rewardPerShare = roundMoney(Math.abs(profitTarget - entryPrice));
  const rMultiple = riskPerShare > 0 ? rewardPerShare / riskPerShare : null;

  return {
    entryPrice: roundMoney(entryPrice),
    quantity: 1,
    stopLoss: roundMoney(stopLoss),
    profitTarget: roundMoney(profitTarget),
    riskPerShare,
    rewardPerShare,
    positionValue: roundMoney(entryPrice),
    maxLoss: riskPerShare,
    maxProfit: rewardPerShare,
    riskRewardLabel:
      rMultiple != null ? `1:${rMultiple.toFixed(1)}` : "—",
  };
}

export function computePlannedR(input: {
  entryPrice: number;
  stopLoss: number;
  profitTarget: number;
  quantity: number;
  direction: JournalDirection;
}): PlannedRPreview | null {
  const { entryPrice, stopLoss, profitTarget, quantity, direction } = input;

  if (
    !Number.isFinite(entryPrice) ||
    entryPrice <= 0 ||
    !Number.isFinite(stopLoss) ||
    stopLoss <= 0 ||
    !Number.isFinite(profitTarget) ||
    profitTarget <= 0 ||
    !Number.isFinite(quantity) ||
    quantity <= 0
  ) {
    return null;
  }

  const riskPerShare = roundMoney(Math.abs(entryPrice - stopLoss));
  const rewardPerShare = roundMoney(Math.abs(profitTarget - entryPrice));

  if (riskPerShare <= 0) return null;

  const plannedRisk = roundMoney(riskPerShare * quantity);
  const maxProfit = roundMoney(rewardPerShare * quantity);
  const rMultiple = rewardPerShare / riskPerShare;

  const isValidLong =
    direction === "Long" && stopLoss < entryPrice && profitTarget > entryPrice;
  const isValidShort =
    direction === "Short" && stopLoss > entryPrice && profitTarget < entryPrice;

  if (!isValidLong && !isValidShort) return null;

  return {
    riskPerShare,
    rewardPerShare,
    plannedRisk,
    maxProfit,
    rMultiple,
    riskRewardLabel: `1:${rMultiple.toFixed(1)}`,
  };
}
