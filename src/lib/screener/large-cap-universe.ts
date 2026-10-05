import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { mapWithConcurrency } from "@/lib/map-with-concurrency";
import { getFreshNseSymbolDirectory } from "@/lib/nse-symbol-directory";
import { MOMENTUM_RULES } from "@/lib/screener/momentum";
import { normalizeEquityTicker } from "@/lib/ticker-normalize";
import { getYahooAuth } from "@/lib/yahoo-earnings";

const YAHOO_USER_AGENT = "Mozilla/5.0 (compatible; SwingTradingLog/1.0)";
const FETCH_TIMEOUT_MS = 12_000;
const CRORE = 10_000_000;
const PAGE_SIZE = 250;
const QUOTE_BATCH = 80;

export type LargeCapStock = {
  ticker: string;
  name: string;
  marketCapCrore: number;
};

type ScreenerQuote = {
  symbol?: string;
  shortName?: string;
  longName?: string;
  marketCap?: number;
  currency?: string;
};

function minMarketCapInr(): number {
  return MOMENTUM_RULES.minMarketCapCrore * CRORE;
}

function croreFromCap(
  marketCap: number | null | undefined,
  currency: string | null | undefined
): number | null {
  if (marketCap == null || !Number.isFinite(marketCap) || marketCap <= 0) {
    return null;
  }
  if (currency != null && currency !== "INR") return null;
  const crore = marketCap / CRORE;
  if (crore < MOMENTUM_RULES.minMarketCapCrore) return null;
  return Math.round(crore);
}

function stockFromQuote(quote: ScreenerQuote): LargeCapStock | null {
  const symbol = quote.symbol?.trim().toUpperCase() ?? "";
  if (!symbol.endsWith(".NS")) return null;
  const ticker = normalizeEquityTicker(symbol.slice(0, -3));
  const crore = croreFromCap(quote.marketCap, quote.currency);
  if (!ticker || crore == null) return null;
  const name = quote.shortName?.trim() || quote.longName?.trim() || ticker;
  return { ticker, name, marketCapCrore: crore };
}

function dedupe(stocks: LargeCapStock[]): LargeCapStock[] {
  const byTicker = new Map<string, LargeCapStock>();
  for (const stock of stocks) {
    const existing = byTicker.get(stock.ticker);
    if (!existing || stock.marketCapCrore > existing.marketCapCrore) {
      byTicker.set(stock.ticker, stock);
    }
  }
  return [...byTicker.values()].sort(
    (left, right) => right.marketCapCrore - left.marketCapCrore
  );
}

async function nseListedNames(): Promise<Map<string, string>> {
  const directory = await getFreshNseSymbolDirectory();
  const names = new Map<string, string>();
  for (const row of directory) {
    const ticker = normalizeEquityTicker(row.code);
    if (!ticker || names.has(ticker)) continue;
    names.set(ticker, row.name);
  }
  return names;
}

function keepNseListed(
  stocks: LargeCapStock[],
  listed: Map<string, string>
): LargeCapStock[] {
  return dedupe(
    stocks.flatMap((stock) => {
      const name = listed.get(stock.ticker);
      if (!name) return [];
      return [{ ...stock, name }];
    })
  );
}

async function fetchScreenerPage(
  auth: { cookie: string; crumb: string },
  offset: number
): Promise<{ total: number; quotes: ScreenerQuote[] }> {
  const url = new URL("https://query1.finance.yahoo.com/v1/finance/screener");
  url.searchParams.set("crumb", auth.crumb);
  const res = await fetchWithTimeout(
    url.toString(),
    {
      method: "POST",
      cache: "no-store",
      headers: {
        "User-Agent": YAHOO_USER_AGENT,
        Cookie: auth.cookie,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        size: PAGE_SIZE,
        offset,
        sortField: "intradaymarketcap",
        sortType: "DESC",
        quoteType: "EQUITY",
        query: {
          operator: "AND",
          operands: [
            { operator: "EQ", operands: ["region", "in"] },
            { operator: "EQ", operands: ["exchange", "NSI"] },
            {
              operator: "gt",
              operands: ["intradaymarketcap", minMarketCapInr() - 1],
            },
          ],
        },
      }),
    },
    FETCH_TIMEOUT_MS
  );
  if (!res.ok) {
    throw new Error("Could not load the live large-cap list.");
  }
  const payload = (await res.json()) as {
    finance?: {
      result?: Array<{ total?: number; quotes?: ScreenerQuote[] }>;
    };
  };
  const result = payload.finance?.result?.[0];
  return {
    total: result?.total ?? 0,
    quotes: result?.quotes ?? [],
  };
}

async function loadFromYahooScreener(
  auth: { cookie: string; crumb: string }
): Promise<LargeCapStock[]> {
  const stocks: LargeCapStock[] = [];
  let offset = 0;
  let total = Number.POSITIVE_INFINITY;

  while (offset < total) {
    const page = await fetchScreenerPage(auth, offset);
    total = page.total;
    for (const quote of page.quotes) {
      const stock = stockFromQuote(quote);
      if (stock) stocks.push(stock);
    }
    if (page.quotes.length === 0) break;
    offset += page.quotes.length;
  }

  return dedupe(stocks);
}

async function loadFromQuoteBatches(
  auth: { cookie: string; crumb: string }
): Promise<LargeCapStock[]> {
  const directory = await getFreshNseSymbolDirectory();
  const chunks: string[][] = [];
  for (let index = 0; index < directory.length; index += QUOTE_BATCH) {
    chunks.push(
      directory.slice(index, index + QUOTE_BATCH).map((row) => `${row.code}.NS`)
    );
  }

  const pages = await mapWithConcurrency(chunks, 4, async (symbols) => {
    const url = new URL("https://query1.finance.yahoo.com/v7/finance/quote");
    url.searchParams.set("symbols", symbols.join(","));
    url.searchParams.set("fields", "marketCap,shortName,currency");
    url.searchParams.set("crumb", auth.crumb);
    const res = await fetchWithTimeout(
      url.toString(),
      {
        cache: "no-store",
        headers: {
          "User-Agent": YAHOO_USER_AGENT,
          Cookie: auth.cookie,
          Accept: "application/json",
        },
      },
      FETCH_TIMEOUT_MS
    );
    if (!res.ok) return [] as LargeCapStock[];
    const payload = (await res.json()) as {
      quoteResponse?: { result?: ScreenerQuote[] };
    };
    return (payload.quoteResponse?.result ?? []).flatMap((quote) => {
      const stock = stockFromQuote(quote);
      return stock ? [stock] : [];
    });
  });

  return dedupe(pages.flat());
}

/** NSE-listed equities whose market cap is at least ₹10,000 crore. */
export async function loadNseLargeCapUniverse(): Promise<LargeCapStock[]> {
  const listed = await nseListedNames();
  if (listed.size === 0) {
    throw new Error("Could not load the NSE stock list.");
  }

  const auth = await getYahooAuth();
  if (!auth) {
    throw new Error("Could not load the live large-cap list.");
  }

  try {
    const screened = keepNseListed(await loadFromYahooScreener(auth), listed);
    if (screened.length > 0) return screened;
  } catch {
    // Fall through to quotes for the NSE directory itself.
  }

  return keepNseListed(await loadFromQuoteBatches(auth), listed);
}
