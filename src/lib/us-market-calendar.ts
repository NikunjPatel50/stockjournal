/** US equity session holidays (NYSE-style), dates in America/New_York calendar. */
export const US_MARKET_HOLIDAYS_2026 = [
  "2026-01-01", // New Year's Day
  "2026-01-19", // MLK Day
  "2026-02-16", // Presidents' Day
  "2026-04-03", // Good Friday
  "2026-05-25", // Memorial Day
  "2026-06-19", // Juneteenth
  "2026-07-03", // Independence Day (observed)
  "2026-09-07", // Labor Day
  "2026-11-26", // Thanksgiving
  "2026-12-25", // Christmas
] as const;

const HOLIDAY_SET = new Set<string>(US_MARKET_HOLIDAYS_2026);

export function isUsMarketHoliday(ymd: string): boolean {
  return HOLIDAY_SET.has(ymd);
}

/** YYYY-MM-DD in a given IANA timezone. Returns "" for an invalid date instead of throwing. */
export function ymdInTimeZone(date: Date, timeZone: string): string {
  if (Number.isNaN(date.getTime())) return "";
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    return "";
  }
}

export function weekdayInTimeZone(
  date: Date,
  timeZone: string
): number {
  if (Number.isNaN(date.getTime())) return date.getDay();
  try {
    const label = new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "short",
    }).format(date);
    const map: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };
    return map[label] ?? date.getDay();
  } catch {
    return date.getDay();
  }
}

/** Minutes since midnight in timezone (0–1439). */
export function minutesSinceMidnightInTimeZone(
  date: Date,
  timeZone: string
): number {
  if (Number.isNaN(date.getTime())) return 0;
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    }).formatToParts(date);
    const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
    const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
    return hour * 60 + minute;
  } catch {
    return 0;
  }
}

export function addCalendarDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

/** Next US equity session open day after `ymd` (exclusive of holidays/weekends). */
export function nextUsTradingDayYmd(ymd: string): string {
  let cursor = addCalendarDaysYmd(ymd, 1);
  for (let i = 0; i < 14; i++) {
    const dow = new Date(`${cursor}T12:00:00Z`).getUTCDay();
    if (dow === 0 || dow === 6) {
      cursor = addCalendarDaysYmd(cursor, 1);
      continue;
    }
    if (isUsMarketHoliday(cursor)) {
      cursor = addCalendarDaysYmd(cursor, 1);
      continue;
    }
    return cursor;
  }
  return cursor;
}
