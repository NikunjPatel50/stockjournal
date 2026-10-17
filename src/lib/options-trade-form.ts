import { format, parseISO } from "date-fns";
import type { JournalTrade, JournalTradeStatus } from "@/lib/journal-types";
import type { ListingMarketId } from "@/lib/equity-listing-markets";
import {
  hasPayoffMetrics,
  type OptionsExitPlanMeta,
  type OptionsLegMeta,
  type OptionsPayoffMetrics,
  type OptionsTemplateId,
  type OptionsTradeMeta,
} from "@/lib/options-trade-meta";

export type OptionsLegDraft = OptionsLegMeta;
export type { OptionsTemplateId } from "@/lib/options-trade-meta";

export const OPTIONS_LOG_TEMPLATES: {
  id: OptionsTemplateId;
  label: string;
  description: string;
  strategyName: string;
  legs: Omit<OptionsLegDraft, "id" | "strike" | "expiry" | "quantity" | "entryPremium" | "exitPremium">[];
}[] = [
  {
    id: "long_call",
    label: "Long call",
    description: "Directional bullish — limited risk",
    strategyName: "Long Call",
    legs: [{ side: "Long", optionType: "Call" }],
  },
  {
    id: "long_put",
    label: "Long put",
    description: "Directional bearish or hedge",
    strategyName: "Long Put",
    legs: [{ side: "Long", optionType: "Put" }],
  },
  {
    id: "short_call",
    label: "Short call",
    description: "Naked or covered call leg",
    strategyName: "Short Call",
    legs: [{ side: "Short", optionType: "Call" }],
  },
  {
    id: "short_put",
    label: "Short put",
    description: "Cash-secured or naked put",
    strategyName: "Short Put",
    legs: [{ side: "Short", optionType: "Put" }],
  },
  {
    id: "bull_put_spread",
    label: "Bull put spread",
    description: "Credit spread — bullish bias",
    strategyName: "Bull Put Spread",
    legs: [
      { side: "Short", optionType: "Put" },
      { side: "Long", optionType: "Put" },
    ],
  },
  {
    id: "bear_call_spread",
    label: "Bear call spread",
    description: "Credit spread — bearish bias",
    strategyName: "Bear Call Spread",
    legs: [
      { side: "Short", optionType: "Call" },
      { side: "Long", optionType: "Call" },
    ],
  },
  {
    id: "iron_condor",
    label: "Iron condor",
    description: "Four-leg neutral credit structure",
    strategyName: "Iron Condor",
    legs: [
      { side: "Short", optionType: "Put" },
      { side: "Long", optionType: "Put" },
      { side: "Short", optionType: "Call" },
      { side: "Long", optionType: "Call" },
    ],
  },
];

function legId() {
  return crypto.randomUUID();
}

export function defaultExpiryYmd(daysAhead = 30) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return format(d, "yyyy-MM-dd");
}

export function legsFromTemplate(
  templateId: OptionsTemplateId,
  contracts = 1
): OptionsLegDraft[] {
  const template = OPTIONS_LOG_TEMPLATES.find((t) => t.id === templateId);
  if (!template) return [];
  return template.legs.map((leg, index) => ({
    id: legId(),
    side: leg.side,
    optionType: leg.optionType,
    strike: 0,
    expiry: defaultExpiryYmd(30 + index * 7),
    quantity: contracts,
    entryPremium: 0,
    exitPremium: 0,
  }));
}

export function netPremiumFromLegs(
  legs: OptionsLegDraft[],
  mode: "entry" | "exit"
): number {
  return legs.reduce((sum, leg) => {
    const premium = mode === "entry" ? leg.entryPremium : leg.exitPremium;
    const notional = premium * leg.quantity;
    return leg.side === "Short" ? sum + notional : sum - notional;
  }, 0);
}

export function buildJournalTradeFromOptionsForm(input: {
  id?: string;
  underlying: string;
  listingMarket: ListingMarketId;
  status: JournalTradeStatus;
  templateId: OptionsTemplateId;
  legs: OptionsLegDraft[];
  maxRisk: number;
  fees: number;
  entryDate: string;
  exitDate: string;
  notes: string;
  tags: string[];
  screenshots: string[];
  ivRank?: number;
  deltaAtEntry?: number;
  payoff?: OptionsPayoffMetrics;
  spotAtEntry?: number;
  exitPlan?: OptionsExitPlanMeta;
  sector?: string;
  marketCapBucket?: string;
}): JournalTrade {
  const template = OPTIONS_LOG_TEMPLATES.find((t) => t.id === input.templateId);
  const strategy = template?.strategyName ?? "Options";
  const contracts = Math.max(1, input.legs[0]?.quantity ?? 1);
  const netEntry = netPremiumFromLegs(input.legs, "entry");
  const netExit = netPremiumFromLegs(input.legs, "exit");
  const isCredit = netEntry >= 0;
  const direction = isCredit ? "Short" : "Long";
  const entryPrice = Math.abs(netEntry) / contracts || 0.01;
  const exitPrice =
    input.status === "Active" ? 0 : Math.abs(netExit) / contracts || 0;

  const gross =
    input.status === "Active"
      ? 0
      : isCredit
        ? (entryPrice - exitPrice) * contracts
        : (exitPrice - entryPrice) * contracts;
  const pnl = gross - input.fees;
  const notional = entryPrice * contracts;
  const roi = notional > 0 ? (pnl / notional) * 100 : 0;

  const holdMs =
    input.status === "Active"
      ? 0
      : new Date(input.exitDate).getTime() - new Date(input.entryDate).getTime();
  const holdTimeHours = Math.max(holdMs / (1000 * 60 * 60), 0);

  const plannedRisk = input.maxRisk > 0 ? input.maxRisk : Math.abs(netEntry) * 2;
  const reward = Math.max(0, gross);
  const rr =
    plannedRisk > 0 ? `1:${(reward / plannedRisk).toFixed(1)}` : "1:1.0";

  const outcome =
    input.status === "Active"
      ? "Breakeven"
      : pnl > 0
        ? "Win"
        : pnl < 0
          ? "Loss"
          : "Breakeven";

  const optionsMeta: OptionsTradeMeta = {
    templateId: input.templateId,
    legs: input.legs,
    maxRisk: input.maxRisk,
    ivRank: input.ivRank,
    deltaAtEntry: input.deltaAtEntry,
    payoff: hasPayoffMetrics(input.payoff) ? input.payoff : undefined,
    spotAtEntry: input.spotAtEntry,
    exitPlan: input.exitPlan,
  };

  return {
    id: input.id ?? crypto.randomUUID(),
    ticker: input.underlying.toUpperCase(),
    listingMarket: input.listingMarket,
    assetClass: "Options",
    direction,
    status: input.status,
    outcome,
    strategy,
    tags: input.tags,
    entryDate: input.entryDate,
    exitDate: input.status === "Active" ? input.entryDate : input.exitDate,
    entryPrice: Math.round(entryPrice * 100) / 100,
    exitPrice: Math.round(exitPrice * 100) / 100,
    quantity: contracts,
    fees: input.fees,
    stopLoss: input.exitPlan
      ? Math.round(input.exitPlan.premiumStop * 100) / 100
      : 0,
    profitTarget: input.exitPlan
      ? Math.round(input.exitPlan.profitTargetPrice * 100) / 100
      : 0,
    pnl: Math.round(pnl * 100) / 100,
    roi: Math.round(roi * 100) / 100,
    holdTimeHours: Math.round(holdTimeHours * 100) / 100,
    riskReward: rr,
    plannedRisk: Math.round(plannedRisk * 100) / 100,
    realizedRisk: pnl < 0 ? Math.abs(pnl) : 0,
    mindset: 3,
    notes: input.notes,
    psychology: [],
    optionsMeta,
    sector: input.sector,
    marketCapBucket: input.marketCapBucket,
    executions:
      input.status === "Active"
        ? [
            {
              id: "e1",
              time: input.entryDate,
              side: "Entry",
              price: entryPrice,
              quantity: contracts,
              fees: input.fees,
            },
          ]
        : [
            {
              id: "e1",
              time: input.entryDate,
              side: "Entry",
              price: entryPrice,
              quantity: contracts,
              fees: input.fees / 2,
            },
            {
              id: "e2",
              time: input.exitDate,
              side: "Exit",
              price: exitPrice,
              quantity: contracts,
              fees: input.fees / 2,
            },
          ],
    screenshots: input.screenshots,
  };
}

export function draftFromJournalTrade(trade: JournalTrade): {
  templateId: OptionsTemplateId;
  legs: OptionsLegDraft[];
  maxRisk: number;
  ivRank?: number;
  deltaAtEntry?: number;
  payoff?: OptionsPayoffMetrics;
  spotAtEntry?: number;
  exitPlan?: OptionsExitPlanMeta;
} | null {
  if (trade.assetClass !== "Options") return null;
  const meta = trade.optionsMeta;
  if (meta) {
    return {
      templateId: meta.templateId,
      legs: meta.legs,
      maxRisk: meta.maxRisk,
      ivRank: meta.ivRank,
      deltaAtEntry: meta.deltaAtEntry,
      payoff: meta.payoff,
      spotAtEntry: meta.spotAtEntry,
      exitPlan: meta.exitPlan,
    };
  }
  const templateId: OptionsTemplateId =
    trade.direction === "Short" ? "short_put" : "long_call";
  return {
    templateId,
    legs: legsFromTemplate(templateId, trade.quantity).map((leg) => ({
      ...leg,
      entryPremium: trade.entryPrice,
      exitPremium: trade.exitPrice,
      strike: 0,
      expiry: defaultExpiryYmd(),
    })),
    maxRisk: trade.plannedRisk,
  };
}

export function formatLegSummary(leg: OptionsLegDraft) {
  const strike = leg.strike > 0 ? leg.strike : "—";
  const exp =
    leg.expiry && leg.expiry.length >= 10
      ? format(parseISO(leg.expiry), "MMM d, yy")
      : "—";
  return `${leg.side} ${leg.quantity}× ${leg.optionType} ${strike} · ${exp}`;
}
