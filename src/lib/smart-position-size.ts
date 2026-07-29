import type { JournalDirection } from "@/lib/journal-types";

export type SmartPositionInput = {
  entryPrice: number;
  capital: number;
  riskReward: string;
  direction: JournalDirection;
  /** Stop distance as % of entry (e.g. 2 = 2% below entry for longs). */
  stopPercent?: number;
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

export function computeSmartPosition(
  input: SmartPositionInput
): SmartPositionResult | { error: string } {
  const entryPrice = input.entryPrice;
  const capital = input.capital;
  const stopPercent = input.stopPercent ?? 2;

  if (!Number.isFinite(entryPrice) || entryPrice <= 0) {
    return { error: "Enter a valid stock price." };
  }
  if (!Number.isFinite(capital) || capital <= 0) {
    return { error: "Enter capital to invest." };
  }
  const rr = parseRiskRewardRatio(input.riskReward);
  if (!rr) {
    return { error: "Use risk:reward format like 1:2." };
  }
  if (stopPercent <= 0 || stopPercent >= 100) {
    return { error: "Stop % must be between 0 and 100." };
  }

  const rawQty = Math.floor(capital / entryPrice);
  if (rawQty < 1) {
    return {
      error: `Capital must cover at least one share at ${entryPrice.toFixed(2)}.`,
    };
  }

  const stopDistance = entryPrice * (stopPercent / 100);
  const rewardDistance = stopDistance * (rr.reward / rr.risk);

  let stopLoss: number;
  let profitTarget: number;

  if (input.direction === "Short") {
    stopLoss = entryPrice + stopDistance;
    profitTarget = entryPrice - rewardDistance;
  } else {
    stopLoss = entryPrice - stopDistance;
    profitTarget = entryPrice + rewardDistance;
  }

  if (stopLoss <= 0 || profitTarget <= 0) {
    return { error: "Adjust stop % — levels must stay positive." };
  }

  const quantity = rawQty;
  const positionValue = roundMoney(entryPrice * quantity);
  const riskPerShare = roundMoney(Math.abs(entryPrice - stopLoss));
  const rewardPerShare = roundMoney(Math.abs(profitTarget - entryPrice));
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
