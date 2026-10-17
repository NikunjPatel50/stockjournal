import {
  differenceInCalendarDays,
  endOfDay,
  isAfter,
  isBefore,
  parseISO,
  startOfDay,
} from "date-fns";
import type { AnalyticsTimeframe } from "@/lib/analytics";
import { getAnalyticsTimeframeRange } from "@/lib/analytics";
import { normalizeListingMarket } from "@/lib/equity-listing-markets";
import type { JournalTrade } from "@/lib/journal-types";
import { sharesPerOptionLot } from "@/lib/nse-fo-lot-size";

export type OptionsStatusTab = "all" | "open" | "closed";

export type OptionsStrategyCategory =
  | "all"
  | "vertical"
  | "iron_condor"
  | "iron_butterfly"
  | "calendar"
  | "straddle_strangle"
  | "covered"
  | "single_leg"
  | "other";

export const OPTIONS_STRATEGY_FILTERS: {
  value: OptionsStrategyCategory;
  label: string;
}[] = [
  { value: "all", label: "All Strategies" },
  { value: "vertical", label: "Vertical Spreads" },
  { value: "iron_condor", label: "Iron Condors" },
  { value: "iron_butterfly", label: "Iron Butterflies" },
  { value: "calendar", label: "Calendars / Diagonals" },
  { value: "straddle_strangle", label: "Straddles & Strangles" },
  { value: "covered", label: "Covered / Protective" },
  { value: "single_leg", label: "Single-leg" },
  { value: "other", label: "Other" },
];

export const OPTIONS_STATUS_TABS: { value: OptionsStatusTab; label: string }[] =
  [
    { value: "all", label: "All" },
    { value: "open", label: "Open" },
    { value: "closed", label: "Closed" },
  ];

export interface OptionsJournalFilters {
  search: string;
  timeframe: AnalyticsTimeframe;
  customFrom?: Date;
  customTo?: Date;
  statusTab: OptionsStatusTab;
  strategyCategory: OptionsStrategyCategory;
}

export function emptyOptionsJournalFilters(): OptionsJournalFilters {
  return {
    search: "",
    timeframe: "all",
    statusTab: "all",
    strategyCategory: "all",
  };
}

export type OptionsLegSide = "Long" | "Short";

export type OptionsLegView = {
  id: string;
  side: OptionsLegSide;
  type: "Call" | "Put" | "Stock";
  strike: number | null;
  expiry: string | null;
  quantity: number;
  premium: number;
  exitPremium: number | null;
};

export type OptionsPositionView = {
  id: string;
  underlying: string;
  strategyLabel: string;
  strategyCategory: OptionsStrategyCategory;
  structureSummary: string;
  status: "Open" | "Closed" | "Assigned";
  direction: JournalTrade["direction"];
  entryDate: string;
  exitDate: string;
  expiry: string | null;
  dte: number | null;
  netPremium: number;
  maxRisk: number | null;
  pnl: number;
  roi: number;
  fees: number;
  tags: string[];
  notes: string;
  legs: OptionsLegView[];
  source: JournalTrade;
};

const STRATEGY_MATCHERS: {
  category: OptionsStrategyCategory;
  patterns: RegExp[];
}[] = [
  {
    category: "iron_condor",
    patterns: [/iron condor/i, /\bIC\b/],
  },
  {
    category: "iron_butterfly",
    patterns: [/iron butterfly/i, /\bIB\b/],
  },
  {
    category: "vertical",
    patterns: [
      /vertical/i,
      /bull put/i,
      /bear call/i,
      /bull call/i,
      /bear put/i,
      /credit spread/i,
      /debit spread/i,
      /put spread/i,
      /call spread/i,
    ],
  },
  {
    category: "calendar",
    patterns: [/calendar/i, /diagonal/i],
  },
  {
    category: "straddle_strangle",
    patterns: [/straddle/i, /strangle/i],
  },
  {
    category: "covered",
    patterns: [/covered call/i, /protective put/i, /collar/i, /wheel/i],
  },
  {
    category: "single_leg",
    patterns: [/naked/i, /long call/i, /long put/i, /short call/i, /short put/i],
  },
];

export function classifyOptionsStrategy(strategy: string): OptionsStrategyCategory {
  const text = strategy.trim();
  if (!text) return "other";
  for (const { category, patterns } of STRATEGY_MATCHERS) {
    if (patterns.some((re) => re.test(text))) return category;
  }
  if (/spread|condor|butterfly|strangle|straddle/i.test(text)) return "other";
  return "single_leg";
}

function isAssignedTrade(trade: JournalTrade) {
  const blob = [trade.notes, ...trade.tags, ...trade.psychology].join(" ").toLowerCase();
  return blob.includes("assigned") || blob.includes("exercise");
}

function inferLegType(strategy: string, direction: JournalTrade["direction"]) {
  const s = strategy.toLowerCase();
  if (s.includes("put")) return "Put" as const;
  if (s.includes("call")) return "Call" as const;
  return direction === "Short" ? ("Put" as const) : ("Call" as const);
}

/**
 * Booked options P&L in account currency, matching the legs table total:
 * each leg's premium change times its quantity and lot size.
 */
export function optionsBookedPnl(trade: JournalTrade): number {
  const lot =
    sharesPerOptionLot(
      trade.ticker,
      normalizeListingMarket(trade.listingMarket ?? "IN_NSE")
    ) || 1;
  const legs = trade.optionsMeta?.legs ?? [];
  if (legs.length > 0 && legs.every((leg) => leg.exitPremium > 0)) {
    const total = legs.reduce((sum, leg) => {
      const shares = leg.quantity * lot;
      const signed = leg.side === "Short" ? -1 : 1;
      return sum + (leg.exitPremium - leg.entryPremium) * shares * signed;
    }, 0);
    return Math.round(total * 100) / 100;
  }

  const scale = lot * Math.max(1, trade.quantity);
  const exit = trade.exitPrice > 0 ? trade.exitPrice : trade.entryPrice;
  const perShare =
    trade.direction === "Short"
      ? trade.entryPrice - exit
      : exit - trade.entryPrice;
  return Math.round(perShare * scale * 100) / 100;
}

export function optionsPositionFromTrade(raw: JournalTrade): OptionsPositionView {
  const trade = withCorrectedOptionsDates(raw);
  const category = classifyOptionsStrategy(trade.strategy);
  const assigned = isAssignedTrade(trade);
  const isOpen = (trade.status ?? "Closed") === "Active" && !assigned;
  const status: OptionsPositionView["status"] = assigned
    ? "Assigned"
    : isOpen
      ? "Open"
      : "Closed";

  const legType = inferLegType(trade.strategy, trade.direction);
  const netPremium =
    trade.direction === "Short"
      ? trade.entryPrice * trade.quantity
      : -(trade.entryPrice * trade.quantity);

  const legs: OptionsLegView[] = trade.optionsMeta?.legs.length
    ? trade.optionsMeta.legs.map((leg) => ({
        id: leg.id,
        side: leg.side,
        type: leg.optionType,
        strike: leg.strike > 0 ? leg.strike : null,
        expiry: leg.expiry
          ? alignExpiryToEntry(
              leg.expiry,
              trade.entryDate,
              status === "Open" ? localIsoDate() : undefined
            )
          : null,
        quantity: leg.quantity,
        premium: leg.entryPremium,
        exitPremium:
          Number.isFinite(leg.exitPremium) && leg.exitPremium > 0
            ? leg.exitPremium
            : null,
      }))
    : [
        {
          id: `${trade.id}-leg-1`,
          side: trade.direction === "Short" ? "Short" : "Long",
          type: legType,
          strike: null,
          expiry: null,
          quantity: trade.quantity,
          premium: trade.entryPrice,
          exitPremium: trade.exitPrice > 0 ? trade.exitPrice : null,
        },
      ];

  const primaryExpiry = legs.find((leg) => leg.expiry)?.expiry;
  const entryDate = primaryExpiry
    ? alignEntryToExpiry(trade.entryDate, primaryExpiry)
    : trade.entryDate;
  const dteReference =
    status === "Open" || !trade.exitDate
      ? new Date()
      : parseISO(trade.exitDate);
  const dte =
    primaryExpiry && primaryExpiry.length >= 10
      ? differenceInCalendarDays(parseISO(primaryExpiry), dteReference)
      : null;

  const maxRisk =
    trade.plannedRisk > 0
      ? trade.plannedRisk
      : trade.stopLoss > 0
        ? Math.abs(trade.stopLoss * trade.quantity)
        : null;

  return {
    id: trade.id,
    underlying: trade.ticker,
    strategyLabel: trade.strategy.trim() || "Unlabeled strategy",
    strategyCategory: category,
    structureSummary:
      category === "single_leg"
        ? `${trade.direction} ${legType}`
        : trade.strategy.trim() || `${trade.direction} options`,
    status,
    direction: trade.direction,
    entryDate,
    exitDate: trade.exitDate,
    expiry: primaryExpiry ?? null,
    dte,
    netPremium,
    maxRisk,
    pnl: isOpen ? trade.pnl : optionsBookedPnl(trade),
    roi: trade.roi,
    fees: trade.fees,
    tags: trade.tags,
    notes: trade.notes,
    legs,
    source: trade,
  };
}

export function filterOptionsPositions(
  positions: OptionsPositionView[],
  filters: OptionsJournalFilters
): OptionsPositionView[] {
  return positions.filter((position) => {
    const q = filters.search.trim().toLowerCase();
    if (q) {
      const haystack = [
        position.underlying,
        position.strategyLabel,
        position.structureSummary,
        position.notes,
        ...position.tags,
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    if (filters.statusTab === "open" && position.status !== "Open") return false;
    if (filters.statusTab === "closed" && position.status !== "Closed") return false;

    if (
      filters.strategyCategory !== "all" &&
      position.strategyCategory !== filters.strategyCategory
    ) {
      return false;
    }

    const { from, to } = getAnalyticsTimeframeRange({
      timeframe: filters.timeframe,
      customFrom: filters.customFrom,
      customTo: filters.customTo,
    });
    const entry = parseISO(position.entryDate);
    if (from && isBefore(entry, startOfDay(from))) return false;
    if (to && isAfter(entry, endOfDay(to))) return false;

    return true;
  });
}

export type OptionsJournalSummary = {
  openCount: number;
  closedCount: number;
  assignedCount: number;
  netPremiumOpen: number;
  realizedPnl: number;
  /** Sum of positive P&L on closed and assigned trades. */
  totalWin: number;
  /** Absolute sum of negative P&L on closed and assigned trades. */
  totalLoss: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  profitFactor: number;
  avgDte: number | null;
  totalFees: number;
};

export function computeOptionsJournalSummary(
  positions: OptionsPositionView[]
): OptionsJournalSummary {
  const open = positions.filter((p) => p.status === "Open");
  const closed = positions.filter((p) => p.status === "Closed");
  const assigned = positions.filter((p) => p.status === "Assigned");
  const decided = positions.filter((p) => p.status !== "Open");

  const wins = decided.filter((p) => p.pnl > 0).length;
  const losses = decided.filter((p) => p.pnl < 0);
  const grossProfit = decided
    .filter((p) => p.pnl > 0)
    .reduce((s, p) => s + p.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, p) => s + p.pnl, 0));
  const winRate = decided.length ? (wins / decided.length) * 100 : 0;
  const profitFactor =
    grossLoss === 0 ? (grossProfit > 0 ? Infinity : 0) : grossProfit / grossLoss;

  const dteValues = open
    .map((p) => p.dte)
    .filter((d): d is number => d != null && d >= 0);
  const avgDte =
    dteValues.length === 0
      ? null
      : dteValues.reduce((a, b) => a + b, 0) / dteValues.length;

  return {
    openCount: open.length,
    closedCount: closed.length,
    assignedCount: assigned.length,
    netPremiumOpen: open.reduce((s, p) => s + p.netPremium, 0),
    realizedPnl: decided.reduce((s, p) => s + p.pnl, 0),
    totalWin: grossProfit,
    totalLoss: grossLoss,
    winningTrades: wins,
    losingTrades: losses.length,
    winRate,
    profitFactor,
    avgDte,
    totalFees: positions.reduce((s, p) => s + p.fees, 0),
  };
}

function localIsoDate(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function addYearsToIso(value: string, years: number) {
  if (years === 0) return value;
  const iso = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return value;
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  date.setUTCFullYear(date.getUTCFullYear() + years);
  return `${date.toISOString().slice(0, 10)}${value.slice(10)}`;
}

/** How many years to add so the date is the latest one that is not after today. */
function yearsUntilNotAfter(value: string, today: string) {
  const iso = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || !/^\d{4}-\d{2}-\d{2}$/.test(today)) {
    return 0;
  }
  const date = new Date(`${iso}T00:00:00Z`);
  const limit = new Date(`${today}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || Number.isNaN(limit.getTime())) return 0;
  let years = 0;
  for (let i = 0; i < 8; i++) {
    const next = new Date(date);
    next.setUTCFullYear(next.getUTCFullYear() + 1);
    if (next > limit) break;
    date.setUTCFullYear(date.getUTCFullYear() + 1);
    years += 1;
  }
  return years;
}

/**
 * Screenshot imports often save 2023 for a trade made this year. Shift entry,
 * exit and expiries forward together, anchored on the exit (or the entry while
 * the trade is open), stopping at the latest date that is not in the future.
 */
export function withCorrectedOptionsDates(
  trade: JournalTrade,
  today = localIsoDate()
): JournalTrade {
  const open = (trade.status ?? "Closed") === "Active";
  const anchor = open ? trade.entryDate : trade.exitDate || trade.entryDate;
  const years = yearsUntilNotAfter(anchor, today);
  if (years === 0) return trade;
  const meta = trade.optionsMeta;
  return {
    ...trade,
    entryDate: addYearsToIso(trade.entryDate, years),
    exitDate: trade.exitDate ? addYearsToIso(trade.exitDate, years) : trade.exitDate,
    optionsMeta: meta
      ? {
          ...meta,
          legs: meta.legs.map((leg) => ({
            ...leg,
            expiry: leg.expiry ? addYearsToIso(leg.expiry, years) : leg.expiry,
          })),
        }
      : meta,
  };
}

/**
 * Broker screens omit the expiry year, so a saved date can land years in the
 * past. Move it forward a year at a time until it sits on the entry, and for
 * an open position until it is still ahead.
 */
export function alignExpiryToEntry(
  expiry: string,
  entryDate: string,
  notBefore?: string
): string {
  const iso = expiry.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return expiry;
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return expiry;

  let floorMs = Number.NEGATIVE_INFINITY;
  const entry = entryDate.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(entry)) {
    const entryFloor = new Date(`${entry}T00:00:00Z`);
    if (!Number.isNaN(entryFloor.getTime())) {
      entryFloor.setUTCDate(entryFloor.getUTCDate() - 7);
      floorMs = entryFloor.getTime();
    }
  }
  if (notBefore && /^\d{4}-\d{2}-\d{2}$/.test(notBefore)) {
    const bound = new Date(`${notBefore}T00:00:00Z`);
    if (
      !Number.isNaN(bound.getTime()) &&
      date.getUTCFullYear() < bound.getUTCFullYear()
    ) {
      floorMs = Math.max(floorMs, bound.getTime());
    }
  }
  if (!Number.isFinite(floorMs)) return expiry;

  const floor = new Date(floorMs);
  for (let i = 0; i < 8 && date < floor; i++) {
    date.setUTCFullYear(date.getUTCFullYear() + 1);
  }
  return date.toISOString().slice(0, 10);
}

/**
 * An entry saved with a guessed year can sit years before the contract it
 * opened. Options trade within a year of expiry, so roll the entry forward
 * until it does. Keeps the time of day.
 */
export function alignEntryToExpiry(entryDate: string, expiry: string): string {
  const entryIso = entryDate.slice(0, 10);
  const expiryIso = expiry.slice(0, 10);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(entryIso) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(expiryIso)
  ) {
    return entryDate;
  }
  const date = new Date(`${entryIso}T00:00:00Z`);
  const ceiling = new Date(`${expiryIso}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || Number.isNaN(ceiling.getTime())) {
    return entryDate;
  }
  ceiling.setUTCFullYear(ceiling.getUTCFullYear() - 1);
  let moved = false;
  for (let i = 0; i < 8 && date < ceiling; i++) {
    date.setUTCFullYear(date.getUTCFullYear() + 1);
    moved = true;
  }
  return moved ? `${date.toISOString().slice(0, 10)}${entryDate.slice(10)}` : entryDate;
}

export function dteFromExpiry(expiry: string, now = new Date()) {
  return differenceInCalendarDays(parseISO(expiry), startOfDay(now));
}
