import type { ListingMarketId } from "@/lib/equity-listing-markets";
import { normalizeQuoteAssetClass } from "@/lib/eodhd";
import type { AssetClass } from "@/lib/journal-types";
import {
  isUsMarketHoliday,
  minutesSinceMidnightInTimeZone,
  weekdayInTimeZone,
  ymdInTimeZone,
} from "@/lib/us-market-calendar";

type SessionConfig = {
  timeZone: string;
  openMinutes: number;
  closeMinutes: number;
  usHolidays?: boolean;
};

/** Regular cash session hours per listing market (local exchange time). */
const LISTING_MARKET_SESSIONS: Partial<
  Record<ListingMarketId, SessionConfig>
> = {
  US: {
    timeZone: "America/New_York",
    openMinutes: 9 * 60 + 30,
    closeMinutes: 16 * 60,
    usHolidays: true,
  },
  IN_NSE: {
    timeZone: "Asia/Kolkata",
    openMinutes: 9 * 60 + 15,
    closeMinutes: 15 * 60 + 30,
  },
  IN_BSE: {
    timeZone: "Asia/Kolkata",
    openMinutes: 9 * 60 + 15,
    closeMinutes: 15 * 60 + 30,
  },
  UK: {
    timeZone: "Europe/London",
    openMinutes: 8 * 60,
    closeMinutes: 16 * 60 + 30,
  },
  CA: {
    timeZone: "America/Toronto",
    openMinutes: 9 * 60 + 30,
    closeMinutes: 16 * 60,
    usHolidays: true,
  },
  DE: {
    timeZone: "Europe/Berlin",
    openMinutes: 9 * 60,
    closeMinutes: 17 * 60 + 30,
  },
  FR: {
    timeZone: "Europe/Paris",
    openMinutes: 9 * 60,
    closeMinutes: 17 * 60 + 30,
  },
  NL: {
    timeZone: "Europe/Amsterdam",
    openMinutes: 9 * 60,
    closeMinutes: 17 * 60 + 30,
  },
  CH: {
    timeZone: "Europe/Zurich",
    openMinutes: 9 * 60,
    closeMinutes: 17 * 60 + 30,
  },
  HK: {
    timeZone: "Asia/Hong_Kong",
    openMinutes: 9 * 60 + 30,
    closeMinutes: 16 * 60,
  },
  AU: {
    timeZone: "Australia/Sydney",
    openMinutes: 10 * 60,
    closeMinutes: 16 * 60,
  },
  JP: {
    timeZone: "Asia/Tokyo",
    openMinutes: 9 * 60,
    closeMinutes: 15 * 60,
  },
  KR: {
    timeZone: "Asia/Seoul",
    openMinutes: 9 * 60,
    closeMinutes: 15 * 60 + 30,
  },
  SG: {
    timeZone: "Asia/Singapore",
    openMinutes: 9 * 60,
    closeMinutes: 17 * 60,
  },
  BR: {
    timeZone: "America/Sao_Paulo",
    openMinutes: 10 * 60,
    closeMinutes: 17 * 60,
  },
  MX: {
    timeZone: "America/Mexico_City",
    openMinutes: 8 * 60 + 30,
    closeMinutes: 15 * 60,
  },
};

export function isListingMarketOpen(
  listingMarket: ListingMarketId,
  now = new Date()
): boolean {
  const cfg = LISTING_MARKET_SESSIONS[listingMarket];
  if (!cfg) return true;

  const dow = weekdayInTimeZone(now, cfg.timeZone);
  if (dow === 0 || dow === 6) return false;

  const ymd = ymdInTimeZone(now, cfg.timeZone);
  if (cfg.usHolidays && isUsMarketHoliday(ymd)) return false;

  const mins = minutesSinceMidnightInTimeZone(now, cfg.timeZone);
  return mins >= cfg.openMinutes && mins < cfg.closeMinutes;
}

export function isSymbolQuoteSessionOpen(
  assetClass: AssetClass,
  listingMarket: ListingMarketId,
  now = new Date()
): boolean {
  const normalized = normalizeQuoteAssetClass(assetClass);

  if (normalized === "Crypto") return true;

  if (normalized === "Forex") {
    const dow = weekdayInTimeZone(now, "America/New_York");
    return dow >= 1 && dow <= 5;
  }

  return isListingMarketOpen(listingMarket, now);
}

export function quotePollIntervalMs(
  symbols: { assetClass: AssetClass; listingMarket: ListingMarketId }[],
  now = new Date()
): number {
  const anyOpen = symbols.some((symbol) =>
    isSymbolQuoteSessionOpen(symbol.assetClass, symbol.listingMarket, now)
  );
  return anyOpen ? 3_000 : 60_000;
}
