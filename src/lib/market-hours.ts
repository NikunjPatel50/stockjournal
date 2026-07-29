import type { AssetClass } from "@/lib/journal-types";
import {
  isUsMarketHoliday,
  minutesSinceMidnightInTimeZone,
  nextUsTradingDayYmd,
  weekdayInTimeZone,
  ymdInTimeZone,
} from "@/lib/us-market-calendar";

export type MarketSessionConfig = {
  timeZone: string;
  /** Regular session close, minutes since midnight in `timeZone`. */
  closeMinutes: number;
  /** Treat Fri close → Mon open as weekend gap risk. */
  weekendGapFromFriday: boolean;
};

export const MARKET_SESSION_BY_ASSET: Record<AssetClass, MarketSessionConfig> = {
  Equities: {
    timeZone: "America/New_York",
    closeMinutes: 16 * 60, // 4:00 PM ET
    weekendGapFromFriday: true,
  },
  Options: {
    timeZone: "America/New_York",
    closeMinutes: 16 * 60,
    weekendGapFromFriday: true,
  },
  Crypto: {
    timeZone: "UTC",
    closeMinutes: 24 * 60, // 24/7 — no daily close; still flag Fri–Sun volatility
    weekendGapFromFriday: true,
  },
  Forex: {
    timeZone: "America/New_York",
    closeMinutes: 17 * 60, // Fri 5 PM ET weekly close framing
    weekendGapFromFriday: true,
  },
};

export function isRegularSessionOpen(
  now: Date,
  assetClass: AssetClass
): boolean {
  const cfg = MARKET_SESSION_BY_ASSET[assetClass];
  const ymd = ymdInTimeZone(now, cfg.timeZone);
  const dow = weekdayInTimeZone(now, cfg.timeZone);

  if (assetClass === "Crypto") return true;

  if (dow === 0 || dow === 6) return false;
  if (isUsMarketHoliday(ymd)) return false;

  const mins = minutesSinceMidnightInTimeZone(now, cfg.timeZone);
  const openMinutes = 9 * 60 + 30; // 9:30 AM ET for US cash session
  return mins >= openMinutes && mins < cfg.closeMinutes;
}

export type GapRiskKind = "overnight" | "weekend" | "holiday";

export function classifyGapRisk(
  now: Date,
  assetClass: AssetClass
): GapRiskKind {
  const cfg = MARKET_SESSION_BY_ASSET[assetClass];
  const ymd = ymdInTimeZone(now, cfg.timeZone);
  const dow = weekdayInTimeZone(now, cfg.timeZone);

  if (cfg.weekendGapFromFriday && dow === 5) {
    return "weekend";
  }

  const tomorrow = nextUsTradingDayYmd(ymd);
  const gapDays =
    (new Date(`${tomorrow}T12:00:00Z`).getTime() -
      new Date(`${ymd}T12:00:00Z`).getTime()) /
    (1000 * 60 * 60 * 24);

  if (gapDays > 1 && assetClass !== "Crypto") {
    return "holiday";
  }

  if (dow === 5 && assetClass === "Crypto") {
    return "weekend";
  }

  return "overnight";
}
