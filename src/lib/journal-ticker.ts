import type { ListingMarketId } from "@/lib/equity-listing-markets";
import {
  isListingMarketOpen,
  isSymbolQuoteSessionOpen,
} from "@/lib/listing-market-hours";
import {
  minutesSinceMidnightInTimeZone,
  weekdayInTimeZone,
} from "@/lib/us-market-calendar";

export type JournalTickerSession = "equity" | "metals" | "forex" | "crypto";

export type JournalTickerInstrument = {
  id: string;
  label: string;
  yahooSymbol: string;
  currency: string;
  session: JournalTickerSession;
  listingMarket?: ListingMarketId;
};

/** Instruments shown on the journal price marquee. */
export const JOURNAL_TICKER_INSTRUMENTS: JournalTickerInstrument[] = [
  {
    id: "nifty50",
    label: "Nifty 50",
    yahooSymbol: "^NSEI",
    currency: "INR",
    session: "equity",
    listingMarket: "IN_NSE",
  },
  {
    id: "sensex",
    label: "Sensex",
    yahooSymbol: "^BSESN",
    currency: "INR",
    session: "equity",
    listingMarket: "IN_BSE",
  },
  {
    id: "gold",
    label: "Gold",
    yahooSymbol: "GC=F",
    currency: "USD",
    session: "metals",
  },
  {
    id: "silver",
    label: "Silver",
    yahooSymbol: "SI=F",
    currency: "USD",
    session: "metals",
  },
  {
    id: "bitcoin",
    label: "Bitcoin",
    yahooSymbol: "BTC-USD",
    currency: "USD",
    session: "crypto",
  },
  {
    id: "usdinr",
    label: "USDINR",
    yahooSymbol: "INR=X",
    currency: "INR",
    session: "forex",
  },
  {
    id: "cadinr",
    label: "CADINR",
    yahooSymbol: "CADINR=X",
    currency: "INR",
    session: "forex",
  },
  {
    id: "ausinr",
    label: "AUSINR",
    yahooSymbol: "AUDINR=X",
    currency: "INR",
    session: "forex",
  },
];

/** COMEX metals: Sunday 18:00 ET through Friday 17:00 ET, with a 17:00–18:00 break. */
function isMetalsSessionOpen(now: Date): boolean {
  const timeZone = "America/New_York";
  const dow = weekdayInTimeZone(now, timeZone);
  const mins = minutesSinceMidnightInTimeZone(now, timeZone);
  if (dow === 6) return false;
  if (dow === 0 && mins < 18 * 60) return false;
  if (dow === 5 && mins >= 17 * 60) return false;
  if (dow >= 1 && dow <= 4 && mins >= 17 * 60 && mins < 18 * 60) return false;
  return true;
}

export function isJournalTickerSessionOpen(
  instrument: JournalTickerInstrument,
  now = new Date()
): boolean {
  if (instrument.session === "crypto") return true;
  if (instrument.session === "forex") {
    return isSymbolQuoteSessionOpen("Forex", "US", now);
  }
  if (instrument.session === "metals") return isMetalsSessionOpen(now);
  if (instrument.listingMarket) {
    return isListingMarketOpen(instrument.listingMarket, now);
  }
  return false;
}

export type JournalTickerQuote = {
  id: string;
  label: string;
  price: number;
  changePercent: number | null;
  currency: string;
  /** True while that instrument's session is open. Closed rows use the last close. */
  sessionOpen: boolean;
};
