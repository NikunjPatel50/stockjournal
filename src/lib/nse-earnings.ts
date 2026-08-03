import { addMonths, format, parse, startOfDay } from "date-fns";
import { fetchWithTimeout, extractResponseCookies } from "@/lib/fetch-with-timeout";
import { normalizeEquityTicker } from "@/lib/ticker-normalize";

const NSE_FETCH_TIMEOUT_MS = 4000;

export type NseEarningsDateInfo = {
  nextEarningsDate: string | null;
  isEstimate: boolean;
};

type NseEvent = {
  symbol?: string;
  purpose?: string;
  bm_desc?: string;
  date?: string;
};

let nseCookieCache: { cookie: string; expiresAt: number } | null = null;

const NSE_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export async function prewarmNseEarningsCache(): Promise<void> {
  await getNseCookie();
}

async function getNseCookie(): Promise<string | null> {
  if (nseCookieCache && Date.now() < nseCookieCache.expiresAt) {
    return nseCookieCache.cookie;
  }

  try {
    const res = await fetchWithTimeout(
      "https://www.nseindia.com/",
      {
        headers: { "User-Agent": NSE_USER_AGENT },
        cache: "no-store",
      },
      NSE_FETCH_TIMEOUT_MS
    );
    const cookie = extractResponseCookies(res);
    if (!cookie) return null;

    nseCookieCache = {
      cookie,
      expiresAt: Date.now() + 30 * 60 * 1000,
    };
    return cookie;
  } catch {
    return null;
  }
}

function isFinancialResultsEvent(event: NseEvent) {
  const text = `${event.purpose ?? ""} ${event.bm_desc ?? ""}`.toLowerCase();
  return (
    text.includes("financial result") ||
    text.includes("financial results") ||
    text.includes("unaudited") ||
    text.includes("audited")
  );
}

function parseNseEventDate(value: string): Date | null {
  const trimmed = value.trim();
  const formats = ["dd-MMM-yyyy", "dd-MM-yyyy", "yyyy-MM-dd"] as const;
  for (const pattern of formats) {
    const parsed = parse(trimmed, pattern, new Date());
    if (!Number.isNaN(parsed.getTime())) {
      return startOfDay(parsed);
    }
  }
  return null;
}

function formatEarningsIso(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export async function fetchNseNextEarningsDate(
  ticker: string
): Promise<NseEarningsDateInfo | null> {
  const symbol = normalizeEquityTicker(ticker);
  if (!symbol) return null;

  const cookie = await getNseCookie();
  if (!cookie) return null;

  const today = startOfDay(new Date());
  const to = addMonths(today, 9);
  const fromParam = format(today, "dd-MM-yyyy");
  const toParam = format(to, "dd-MM-yyyy");

  const url = new URL("https://www.nseindia.com/api/event-calendar");
  url.searchParams.set("index", "equities");
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("from_date", fromParam);
  url.searchParams.set("to_date", toParam);

  try {
    const res = await fetchWithTimeout(
      url.toString(),
      {
        cache: "no-store",
        headers: {
          "User-Agent": NSE_USER_AGENT,
          Accept: "application/json",
          Referer: "https://www.nseindia.com/",
          Cookie: cookie,
        },
      },
      NSE_FETCH_TIMEOUT_MS
    );
    if (!res.ok) return null;

    const events = (await res.json()) as NseEvent[];
    if (!Array.isArray(events)) return null;

    const upcoming = events
      .filter(isFinancialResultsEvent)
      .map((event) => ({
        event,
        date: event.date ? parseNseEventDate(event.date) : null,
      }))
      .filter(
        (entry): entry is { event: NseEvent; date: Date } =>
          entry.date != null && entry.date >= today
      )
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    const next = upcoming[0];
    if (!next) return null;

    return {
      nextEarningsDate: formatEarningsIso(next.date),
      isEstimate: false,
    };
  } catch {
    return null;
  }
}
