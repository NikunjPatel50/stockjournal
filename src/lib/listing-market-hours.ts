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

/** Whether the regular session has finished for a bar date on the listing exchange. */
export function isExchangeSessionClosedForDate(
  listingMarket: ListingMarketId,
  barDateYmd: string,
  now = new Date()
): boolean {
  const cfg = LISTING_MARKET_SESSIONS[listingMarket];
  if (!cfg) return true;

  const todayYmd = ymdInTimeZone(now, cfg.timeZone);
  if (barDateYmd < todayYmd) return true;
  if (barDateYmd > todayYmd) return false;

  const dow = weekdayInTimeZone(now, cfg.timeZone);
  if (dow === 0 || dow === 6) return false;
  if (cfg.usHolidays && isUsMarketHoliday(todayYmd)) return false;

  const mins = minutesSinceMidnightInTimeZone(now, cfg.timeZone);
  return mins >= cfg.closeMinutes;
}

/**
 * Whether the regular session has opened (or already finished) for a given
 * date — true from market open onward, false before open (or on a
 * weekend/holiday when the market never opens). Use this to gate live-quote
 * P&L so it starts fresh at zero pre-market and updates continuously once
 * trading begins, instead of waiting until the session fully closes.
 */
export function hasExchangeSessionStartedForDate(
  listingMarket: ListingMarketId,
  barDateYmd: string,
  now = new Date()
): boolean {
  const cfg = LISTING_MARKET_SESSIONS[listingMarket];
  if (!cfg) return true;

  const todayYmd = ymdInTimeZone(now, cfg.timeZone);
  if (barDateYmd < todayYmd) return true;
  if (barDateYmd > todayYmd) return false;

  const dow = weekdayInTimeZone(now, cfg.timeZone);
  if (dow === 0 || dow === 6) return false;
  if (cfg.usHolidays && isUsMarketHoliday(todayYmd)) return false;

  const mins = minutesSinceMidnightInTimeZone(now, cfg.timeZone);
  return mins >= cfg.openMinutes;
}

export function timeZoneForListingMarket(
  listingMarket: ListingMarketId
): string {
  return LISTING_MARKET_SESSIONS[listingMarket]?.timeZone ?? "UTC";
}

export function todayYmdForListingMarket(
  listingMarket: ListingMarketId,
  now = new Date()
): string {
  const cfg = LISTING_MARKET_SESSIONS[listingMarket];
  if (!cfg) return ymdInTimeZone(now, "UTC");
  return ymdInTimeZone(now, cfg.timeZone);
}

export function isExchangeSessionPendingForToday(
  listingMarket: ListingMarketId,
  now = new Date()
): boolean {
  const cfg = LISTING_MARKET_SESSIONS[listingMarket];
  if (!cfg) return false;

  const todayYmd = ymdInTimeZone(now, cfg.timeZone);
  const dow = weekdayInTimeZone(now, cfg.timeZone);
  if (dow === 0 || dow === 6) return false;
  if (cfg.usHolidays && isUsMarketHoliday(todayYmd)) return false;

  const mins = minutesSinceMidnightInTimeZone(now, cfg.timeZone);
  return mins < cfg.closeMinutes;
}

export function sessionCloseDescription(
  listingMarket: ListingMarketId
): string {
  const cfg = LISTING_MARKET_SESSIONS[listingMarket];
  if (!cfg) return "market close";

  const hours = Math.floor(cfg.closeMinutes / 60);
  const minutes = cfg.closeMinutes % 60;
  const period = hours >= 12 ? "PM" : "AM";
  const h12 = hours % 12 || 12;
  const time =
    minutes === 0
      ? `${h12} ${period}`
      : `${h12}:${minutes.toString().padStart(2, "0")} ${period}`;

  const timeZoneName =
    new Intl.DateTimeFormat("en", {
      timeZone: cfg.timeZone,
      timeZoneName: "short",
    })
      .formatToParts(new Date())
      .find((part) => part.type === "timeZoneName")?.value ?? "";

  return timeZoneName ? `${time} ${timeZoneName}` : time;
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
