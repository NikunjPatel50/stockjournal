import { normalizeEquityTicker } from "@/lib/ticker-normalize";

/** Shorthand or alternate codes → official NSE/BSE symbol for market-data APIs. */
const IN_EQUITY_TICKER_ALIASES: Record<string, string> = {
  PRICOL: "PRICOLLTD",
  /** Common shorthand for TVS Motor Company Limited (NSE: TVSMOTOR). */
  TVS: "TVSMOTOR",
};

/** Resolve Indian equity ticker aliases (e.g. PRICOL → PRICOLLTD). */
export function resolveIndianEquityTickerAlias(ticker: string): string {
  const base = normalizeEquityTicker(ticker);
  return IN_EQUITY_TICKER_ALIASES[base] ?? base;
}
