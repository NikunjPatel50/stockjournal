import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import type { ListingMarketId } from "@/lib/equity-listing-markets";
import type { OptionsLegMeta } from "@/lib/options-trade-meta";

const MS_PER_YEAR = 365 * 24 * 60 * 60 * 1000;
const FALLBACK_IV = 0.3;

export type ExitPlanSettings = {
  /** Credit trades: stop when loss reaches this multiple of the credit. */
  lossMultiple: number;
  /** Debit trades: stop when this % of the debit paid is lost. */
  debitStopPct: number;
  /** % of max profit (or of debit when profit is unlimited) to take. */
  profitTargetPct: number;
};

export const DEFAULT_EXIT_PLAN_SETTINGS: ExitPlanSettings = {
  lossMultiple: 3,
  debitStopPct: 50,
  profitTargetPct: 50,
};

export type ExitPlanInput = {
  legs: OptionsLegMeta[];
  contracts: number;
  entryDate: string;
  spot: number;
  listingMarket: ListingMarketId;
  settings: ExitPlanSettings;
  /** Currency per 1.00 of premium per spread (lot size); unknown → per share. */
  multiplier?: number;
  asOf?: Date;
};

export type UnderlyingStopCheckpoint = {
  label: string;
  date: string;
  daysToExpiry: number;
  below?: number;
  above?: number;
};

export type ExitPlanQuoteLeg = {
  optionType: OptionsLegMeta["optionType"];
  strike: number;
  expiry: string;
  /** +1 short / −1 long, scaled to one spread. */
  weight: number;
  iv: number;
};

export type ExitPlan = {
  kind: "credit" | "debit";
  /** Net premium per spread (always positive). */
  premium: number;
  /** Loss per spread at which the stop fires. */
  lossBudget: number;
  /** Spread price that fires the stop: buy-to-close (credit) / sell-to-close (debit). */
  premiumStop: number;
  profitTargetPrice: number;
  profitTargetPnl: number;
  maxProfit: number | null;
  maxLoss: number | null;
  stopBeyondMaxLoss: boolean;
  spotBeyondStop: boolean;
  checkpoints: UnderlyingStopCheckpoint[];
  shortStrikes: number[];
  timeStop: { date: string; reason: string };
  legVols: { legId: string; iv: number; assumed: boolean }[];
  multiplier?: number;
  contracts: number;
  riskFreeRate: number;
  /** Spot the plan was built from. */
  spot: number;
  /** Valuation date (yyyy-MM-dd). */
  asOf: string;
  /** Nearest expiry (yyyy-MM-dd). */
  expiry: string;
  daysLeft: number;
  entryNet: number;
  quotes: ExitPlanQuoteLeg[];
};

function normCdf(x: number) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804 * Math.exp((-x * x) / 2);
  const p =
    d *
    t *
    (0.31938153 +
      t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return x > 0 ? 1 - p : p;
}

function intrinsic(type: OptionsLegMeta["optionType"], s: number, k: number) {
  return type === "Call" ? Math.max(0, s - k) : Math.max(0, k - s);
}

export function blackScholesPrice(
  type: OptionsLegMeta["optionType"],
  s: number,
  k: number,
  t: number,
  r: number,
  sigma: number
) {
  if (t <= 0 || sigma <= 0 || s <= 0) return intrinsic(type, s, k);
  const sqrtT = Math.sqrt(t);
  const d1 = (Math.log(s / k) + (r + (sigma * sigma) / 2) * t) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;
  const discK = k * Math.exp(-r * t);
  return type === "Call"
    ? s * normCdf(d1) - discK * normCdf(d2)
    : discK * normCdf(-d2) - s * normCdf(-d1);
}

function impliedVol(
  type: OptionsLegMeta["optionType"],
  price: number,
  s: number,
  k: number,
  t: number,
  r: number
): number | null {
  if (t <= 0 || price <= 0) return null;
  let lo = 0.01;
  let hi = 4;
  if (price < blackScholesPrice(type, s, k, t, r, lo)) return null;
  if (price > blackScholesPrice(type, s, k, t, r, hi)) return null;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (blackScholesPrice(type, s, k, t, r, mid) > price) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

function expiryInstant(ymd: string) {
  const date = parseISO(ymd);
  date.setHours(15, 30, 0, 0);
  return date;
}

function yearsBetween(from: Date, to: Date) {
  return Math.max(0, (to.getTime() - from.getTime()) / MS_PER_YEAR);
}

function riskFreeRateFor(market: ListingMarketId) {
  return market === "IN_NSE" || market === "IN_BSE" ? 0.065 : 0.045;
}

function previousWeekday(date: Date) {
  const d = new Date(date);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1);
  return d;
}

function bisect(
  f: (s: number) => number,
  a: number,
  b: number,
  iterations = 50
) {
  let lo = a;
  let hi = b;
  const fLo = f(lo);
  for (let i = 0; i < iterations; i++) {
    const mid = (lo + hi) / 2;
    if (Math.sign(f(mid)) === Math.sign(fLo)) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Nearest price on each side of spot where `f` changes sign (f(spot) > 0). */
function nearestCrossings(f: (s: number) => number, spot: number) {
  const step = spot * 0.0025;
  const result: { below?: number; above?: number } = {};
  let prev = spot;
  for (let s = spot - step; s >= spot * 0.3; s -= step) {
    if (f(s) <= 0) {
      result.below = bisect(f, s, prev);
      break;
    }
    prev = s;
  }
  prev = spot;
  for (let s = spot + step; s <= spot * 1.7; s += step) {
    if (f(s) <= 0) {
      result.above = bisect(f, prev, s);
      break;
    }
    prev = s;
  }
  return result;
}

export function buildExitPlan(input: ExitPlanInput): ExitPlan | null {
  const contracts = Math.max(1, input.contracts);
  const legs = input.legs.filter(
    (leg) => leg.strike > 0 && leg.entryPremium > 0 && leg.expiry
  );
  if (legs.length === 0 || legs.length !== input.legs.length) return null;
  if (!(input.spot > 0)) return null;

  const r = riskFreeRateFor(input.listingMarket);
  const entryAt = parseISO(input.entryDate);
  const now = input.asOf ?? new Date();
  const expiries = legs.map((leg) => expiryInstant(leg.expiry));
  const nearestExpiry = new Date(Math.min(...expiries.map((d) => d.getTime())));
  const refDate =
    now > entryAt && now < nearestExpiry ? now : entryAt < nearestExpiry ? entryAt : now;

  const weight = (leg: OptionsLegMeta) =>
    (leg.side === "Short" ? 1 : -1) * (leg.quantity / contracts);

  const entryNet = legs.reduce(
    (sum, leg) => sum + weight(leg) * leg.entryPremium,
    0
  );
  const kind: ExitPlan["kind"] = entryNet >= 0 ? "credit" : "debit";
  const premium = Math.abs(entryNet);
  if (premium <= 0) return null;

  const solved = legs.map((leg) => {
    const t = yearsBetween(entryAt, expiryInstant(leg.expiry));
    return impliedVol(leg.optionType, leg.entryPremium, input.spot, leg.strike, t, r);
  });
  const known = solved.filter((v): v is number => v != null);
  const fallback = known.length
    ? known.reduce((a, b) => a + b, 0) / known.length
    : FALLBACK_IV;
  const legVols = legs.map((leg, index) => ({
    legId: leg.id,
    iv: solved[index] ?? fallback,
    assumed: solved[index] == null,
  }));

  const closeCostAt = (s: number, at: Date) =>
    legs.reduce((sum, leg, index) => {
      const t = yearsBetween(at, expiryInstant(leg.expiry));
      const price = blackScholesPrice(
        leg.optionType,
        s,
        leg.strike,
        t,
        r,
        legVols[index].iv
      );
      return sum + weight(leg) * price;
    }, 0);
  const pnlAt = (s: number, at: Date) => entryNet - closeCostAt(s, at);

  const strikes = legs.map((leg) => leg.strike);
  const maxStrike = Math.max(...strikes);
  const expiryPnl = (s: number) => pnlAt(s, nearestExpiry);
  const samples = [0, ...strikes, maxStrike * 3].map(expiryPnl);
  const unlimitedUp = expiryPnl(maxStrike * 6) < expiryPnl(maxStrike * 3) - 1e-6;
  const unlimitedProfitUp =
    expiryPnl(maxStrike * 6) > expiryPnl(maxStrike * 3) + 1e-6;
  const maxLoss = unlimitedUp ? null : Math.max(0, -Math.min(...samples));
  const maxProfit = unlimitedProfitUp ? null : Math.max(0, Math.max(...samples));

  const { lossMultiple, debitStopPct, profitTargetPct } = input.settings;
  const lossBudget =
    kind === "credit"
      ? premium * Math.max(0.1, lossMultiple)
      : premium * Math.min(1, Math.max(0.05, debitStopPct / 100));

  const premiumStop =
    kind === "credit" ? premium + lossBudget : Math.max(0, premium - lossBudget);

  const targetBase =
    maxProfit != null ? maxProfit : premium;
  const profitTargetPnl = targetBase * Math.max(0.05, profitTargetPct / 100);
  const profitTargetPrice =
    kind === "credit"
      ? Math.max(0, premium - profitTargetPnl)
      : premium + profitTargetPnl;

  const stopFn = (at: Date) => (s: number) => pnlAt(s, at) + lossBudget;
  const spotBeyondStop = stopFn(refDate)(input.spot) <= 0;

  const daysLeft = Math.max(0, differenceInCalendarDays(nearestExpiry, refDate));
  const checkpointDefs: { label: string; at: Date }[] = [
    { label: "Today", at: refDate },
  ];
  if (daysLeft > 10) {
    checkpointDefs.push({
      label: "Halfway",
      at: addDays(refDate, Math.round(daysLeft / 2)),
    });
  }
  if (daysLeft > 9) {
    checkpointDefs.push({ label: "1 week left", at: addDays(nearestExpiry, -7) });
  }
  if (daysLeft > 3) {
    checkpointDefs.push({ label: "2 days left", at: addDays(nearestExpiry, -2) });
  }
  checkpointDefs.push({ label: "Expiry", at: nearestExpiry });

  const checkpoints: UnderlyingStopCheckpoint[] = spotBeyondStop
    ? []
    : checkpointDefs.map(({ label, at }) => ({
        label,
        date: format(at, "yyyy-MM-dd"),
        daysToExpiry: Math.max(0, differenceInCalendarDays(nearestExpiry, at)),
        ...nearestCrossings(stopFn(at), input.spot),
      }));

  const isIndian =
    input.listingMarket === "IN_NSE" || input.listingMarket === "IN_BSE";
  const timeStopDate = previousWeekday(addDays(nearestExpiry, isIndian ? -2 : -1));
  const timeStop = {
    date: format(timeStopDate, "yyyy-MM-dd"),
    reason: isIndian
      ? "NSE stock options are physically settled — exit before expiry week's final sessions to avoid delivery obligations and the margin step-up."
      : "Close before expiry to avoid pin risk and early-assignment surprises on the short leg.",
  };

  return {
    kind,
    premium,
    lossBudget,
    premiumStop,
    profitTargetPrice,
    profitTargetPnl,
    maxProfit,
    maxLoss,
    stopBeyondMaxLoss: maxLoss != null && lossBudget >= maxLoss,
    spotBeyondStop,
    checkpoints,
    shortStrikes: legs
      .filter((leg) => leg.side === "Short")
      .map((leg) => leg.strike)
      .sort((a, b) => a - b),
    timeStop,
    legVols,
    multiplier: input.multiplier,
    contracts,
    riskFreeRate: r,
    spot: input.spot,
    asOf: format(refDate, "yyyy-MM-dd"),
    expiry: format(nearestExpiry, "yyyy-MM-dd"),
    daysLeft,
    entryNet,
    quotes: legs.map((leg, index) => ({
      optionType: leg.optionType,
      strike: leg.strike,
      expiry: leg.expiry,
      weight: weight(leg),
      iv: legVols[index].iv,
    })),
  };
}

/** Mark-to-close of one spread at a spot and time. Positive means you pay to exit a credit. */
export function quoteSpread(plan: ExitPlan, spot: number, at: Date) {
  const closePrice = plan.quotes.reduce((sum, leg) => {
    const t = yearsBetween(at, expiryInstant(leg.expiry));
    const price = blackScholesPrice(
      leg.optionType,
      spot,
      leg.strike,
      t,
      plan.riskFreeRate,
      leg.iv
    );
    return sum + leg.weight * price;
  }, 0);
  const mark = plan.kind === "credit" ? closePrice : -closePrice;
  return {
    /** Price you trade at to get out. */
    exitPrice: Math.max(0, mark),
    pnl: plan.entryNet - closePrice,
  };
}

/**
 * Stock prices on either side of `spot` where the spread reaches its premium
 * stop on `at`. Empty sides mean the stop is not reachable within ±70%.
 */
export function stopSpotsAt(plan: ExitPlan, spot: number, at: Date) {
  const stopFn = (s: number) => plan.lossBudget + quoteSpread(plan, s, at).pnl;
  if (stopFn(spot) <= 0) return { breached: true as const };
  return { breached: false as const, ...nearestCrossings(stopFn, spot) };
}

/** Spot implied by the broker's breakeven and its % distance from spot. */
export function spotFromBreakeven(
  breakevens: number[] | undefined,
  breakevenPct: number | undefined
) {
  const breakeven = breakevens?.[0];
  if (!breakeven || breakevenPct == null) return undefined;
  const spot = breakeven / (1 + breakevenPct / 100);
  return Number.isFinite(spot) && spot > 0 ? spot : undefined;
}
