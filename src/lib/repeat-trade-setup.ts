import type { JournalTrade } from "@/lib/journal-types";
import { normalizeEquityTicker } from "@/lib/ticker-normalize";
import {
  parseRiskRewardRatio,
  type SmartPositionResult,
} from "@/lib/smart-position-size";

export type RepeatSetupFields = {
  strategy: string;
  tags: string[];
  psychology: string[];
  direction: JournalTrade["direction"];
  assetClass: JournalTrade["assetClass"];
  riskReward: string;
  stopPercent: number;
  quantity: number;
  stopLoss: number;
  profitTarget: number;
};

export function findRepeatSetupSource(
  trades: JournalTrade[],
  ticker?: string,
  excludeId?: string
): JournalTrade | null {
  const sorted = [...trades]
    .filter((trade) => trade.id !== excludeId)
    .sort(
      (a, b) =>
        new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime()
    );

  if (sorted.length === 0) return null;

  const normalized = ticker
    ? normalizeEquityTicker(ticker)?.toUpperCase()
    : "";
  if (normalized) {
    const onTicker = sorted.find(
      (trade) => normalizeEquityTicker(trade.ticker)?.toUpperCase() === normalized
    );
    if (onTicker) return onTicker;
  }

  return sorted[0];
}

export function deriveStopPercentFromTrade(trade: JournalTrade): number {
  if (trade.entryPrice <= 0 || trade.stopLoss <= 0) return 2;
  const pct =
    (Math.abs(trade.entryPrice - trade.stopLoss) / trade.entryPrice) * 100;
  return Math.round(pct * 100) / 100 || 2;
}

export function extractRepeatSetupFields(
  trade: JournalTrade
): RepeatSetupFields {
  return {
    strategy: trade.strategy,
    tags: [...trade.tags],
    psychology: [...trade.psychology],
    direction: trade.direction,
    assetClass: trade.assetClass,
    riskReward: trade.riskReward || "1:2",
    stopPercent: deriveStopPercentFromTrade(trade),
    quantity: trade.quantity,
    stopLoss: trade.stopLoss,
    profitTarget: trade.profitTarget,
  };
}

export function applyRepeatSetupToPricing(
  entryPrice: number,
  fields: RepeatSetupFields
): Pick<SmartPositionResult, "entryPrice" | "stopLoss" | "profitTarget"> | {
  error: string;
} {
  if (!Number.isFinite(entryPrice) || entryPrice <= 0) {
    return { error: "Enter an entry price before repeating setup." };
  }

  const rr = parseRiskRewardRatio(fields.riskReward);
  if (!rr) {
    return { error: "Previous trade has an invalid risk:reward ratio." };
  }

  const stopDistance = entryPrice * (fields.stopPercent / 100);
  const rewardDistance = stopDistance * (rr.reward / rr.risk);

  let stopLoss: number;
  let profitTarget: number;

  if (fields.direction === "Short") {
    stopLoss = entryPrice + stopDistance;
    profitTarget = entryPrice - rewardDistance;
  } else {
    stopLoss = entryPrice - stopDistance;
    profitTarget = entryPrice + rewardDistance;
  }

  if (stopLoss <= 0 || profitTarget <= 0) {
    return { error: "Could not derive levels from the previous trade." };
  }

  const round = (n: number) => Math.round(n * 100) / 100;

  return {
    entryPrice: round(entryPrice),
    stopLoss: round(stopLoss),
    profitTarget: round(profitTarget),
  };
}
