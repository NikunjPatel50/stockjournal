import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { mapWithConcurrency } from "@/lib/map-with-concurrency";
import { parseNseEquityCsv } from "@/lib/nse-symbol-directory-shared";
import { getFreshNseSymbolDirectory } from "@/lib/nse-symbol-directory";
import { MOMENTUM_RULES } from "@/lib/screener/momentum";
import { normalizeEquityTicker } from "@/lib/ticker-normalize";
import { getYahooAuth } from "@/lib/yahoo-earnings";

type IndianListing = "IN_NSE" | "IN_BSE";

const YAHOO_USER_AGENT = "Mozilla/5.0 (compatible; SwingTradingLog/1.0)";
const FETCH_TIMEOUT_MS = 12_000;
const CRORE = 10_000_000;
const PAGE_SIZE = 250;
const QUOTE_BATCH = 80;
const MAX_SCREENER_ROWS = 20_000;
/** Last close must be above this many rupees, and trailing EPS must be positive. */
export const LISTED_MIN_PRICE = 150;
export const LISTED_QUOTE_QUALITY = {
  minPrice: LISTED_MIN_PRICE,
  minTrailingEps: 0,
} as const;

export function listedPriceQualifies(
  price: number | null | undefined
): price is number {
  return (
    typeof price === "number" &&
    Number.isFinite(price) &&
    price > LISTED_MIN_PRICE
  );
}
const NSE_SME_CSV_URL =
  "https://nsearchives.nseindia.com/emerge/content/SME_EQUITY_L.csv";

export type LargeCapStock = {
  ticker: string;
  name: string;
  marketCapCrore: number | null;
  listingMarket: IndianListing;
};

type ScreenerQuote = {
  symbol?: string;
  shortName?: string;
  longName?: string;
  marketCap?: number;
  currency?: string;
  regularMarketPrice?: number;
  epsTrailingTwelveMonths?: number;
};

type QuoteQuality = {
  minPrice: number;
  minTrailingEps: number;
};

function quotePassesQuality(
  quote: ScreenerQuote,
  quality: QuoteQuality | undefined
): boolean {
  if (!quality) return true;
  if (quote.currency != null && quote.currency !== "INR") return false;
  const price = quote.regularMarketPrice;
  const eps = quote.epsTrailingTwelveMonths;
  return (
    typeof price === "number" &&
    Number.isFinite(price) &&
    price > quality.minPrice &&
    typeof eps === "number" &&
    Number.isFinite(eps) &&
    eps > quality.minTrailingEps
  );
}

function croreFromCap(
  marketCap: number | null | undefined,
  currency: string | null | undefined
): number | null {
  if (marketCap == null || !Number.isFinite(marketCap) || marketCap <= 0) {
    return null;
  }
  if (currency != null && currency !== "INR") return null;
  return Math.round(marketCap / CRORE);
}

function capRank(stock: LargeCapStock): number {
  return stock.marketCapCrore ?? -1;
}

function stockFromQuote(
  quote: ScreenerQuote,
  suffix: ".NS" | ".BO",
  listingMarket: IndianListing,
  minCrore: number
): LargeCapStock | null {
  const symbol = quote.symbol?.trim().toUpperCase() ?? "";
  if (!symbol.endsWith(suffix)) return null;
  const ticker = normalizeEquityTicker(symbol.slice(0, -suffix.length));
  if (!ticker) return null;
  const crore = croreFromCap(quote.marketCap, quote.currency);
  if (crore == null) {
    if (minCrore > 0) return null;
    const name = quote.shortName?.trim() || quote.longName?.trim() || ticker;
    return { ticker, name, marketCapCrore: null, listingMarket };
  }
  if (crore < minCrore) return null;
  const name = quote.shortName?.trim() || quote.longName?.trim() || ticker;
  return { ticker, name, marketCapCrore: crore, listingMarket };
}

function dedupe(stocks: LargeCapStock[]): LargeCapStock[] {
  const byTicker = new Map<string, LargeCapStock>();
  for (const stock of stocks) {
    const existing = byTicker.get(stock.ticker);
    if (!existing || capRank(stock) > capRank(existing)) {
      byTicker.set(stock.ticker, stock);
    }
  }
  return [...byTicker.values()].sort(
    (left, right) => capRank(right) - capRank(left)
  );
}

/** One row per company. NSE wins when the same ticker is listed on both exchanges. */
function mergeListings(stocks: LargeCapStock[]): LargeCapStock[] {
  const byTicker = new Map<string, LargeCapStock>();
  for (const stock of stocks) {
    const existing = byTicker.get(stock.ticker);
    if (!existing) {
      byTicker.set(stock.ticker, stock);
      continue;
    }
    const existingNse = existing.listingMarket === "IN_NSE";
    const nextNse = stock.listingMarket === "IN_NSE";
    if (existingNse && !nextNse) continue;
    if (nextNse && !existingNse) {
      byTicker.set(stock.ticker, stock);
      continue;
    }
    if (capRank(stock) > capRank(existing)) {
      byTicker.set(stock.ticker, stock);
    }
  }
  return [...byTicker.values()].sort(
    (left, right) => capRank(right) - capRank(left)
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
  offset: number,
  exchange: string,
  minCrore: number,
  quality?: QuoteQuality
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
            { operator: "EQ", operands: ["exchange", exchange] },
            ...(minCrore > 0
              ? [
                  {
                    operator: "gt",
                    operands: ["intradaymarketcap", minCrore * CRORE - 1],
                  },
                ]
              : []),
            ...(quality
              ? [
                  {
                    operator: "gt",
                    operands: ["intradayprice", quality.minPrice],
                  },
                  {
                    operator: "gt",
                    operands: ["epstrailingtwelvemonths", quality.minTrailingEps],
                  },
                ]
              : []),
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
  auth: { cookie: string; crumb: string },
  exchange: string,
  suffix: ".NS" | ".BO",
  listingMarket: IndianListing,
  minCrore: number = MOMENTUM_RULES.minMarketCapCrore,
  quality?: QuoteQuality
): Promise<LargeCapStock[]> {
  const stocks: LargeCapStock[] = [];
  let offset = 0;
  let total = Number.POSITIVE_INFINITY;

  while (offset < total && offset < MAX_SCREENER_ROWS) {
    const page = await fetchScreenerPage(
      auth,
      offset,
      exchange,
      minCrore,
      quality
    );
    total = page.total;
    for (const quote of page.quotes) {
      if (!quotePassesQuality(quote, quality)) continue;
      const stock = stockFromQuote(quote, suffix, listingMarket, minCrore);
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
      const stock = stockFromQuote(
        quote,
        ".NS",
        "IN_NSE",
        MOMENTUM_RULES.minMarketCapCrore
      );
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
    const screened = keepNseListed(
      await loadFromYahooScreener(auth, "NSI", ".NS", "IN_NSE"),
      listed
    );
    if (screened.length > 0) return screened;
  } catch {
    // Fall through to quotes for the NSE directory itself.
  }

  return keepNseListed(await loadFromQuoteBatches(auth), listed);
}

async function loadBseLargeCaps(
  auth: { cookie: string; crumb: string }
): Promise<LargeCapStock[]> {
  for (const exchange of ["BSE", "BOM"]) {
    try {
      const stocks = await loadFromYahooScreener(
        auth,
        exchange,
        ".BO",
        "IN_BSE"
      );
      if (stocks.length > 0) return stocks;
    } catch {
      // Try the other Yahoo exchange code for BSE.
    }
  }
  return [];
}

/**
 * NSE and BSE equities at or above ₹10,000 crore.
 * A name listed on both exchanges is kept once, on NSE.
 */
export async function loadIndianLargeCapUniverse(): Promise<LargeCapStock[]> {
  const nse = await loadNseLargeCapUniverse();
  const auth = await getYahooAuth();
  if (!auth) return nse;

  let bse: LargeCapStock[] = [];
  try {
    bse = await loadBseLargeCaps(auth);
  } catch {
    bse = [];
  }

  return mergeListings([...nse, ...bse]);
}

async function nseSmeNames(): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  try {
    const res = await fetchWithTimeout(
      NSE_SME_CSV_URL,
      {
        cache: "no-store",
        headers: {
          "User-Agent": YAHOO_USER_AGENT,
          Accept: "text/csv,*/*",
        },
      },
      FETCH_TIMEOUT_MS
    );
    if (!res.ok) return names;
    for (const row of parseNseEquityCsv(await res.text())) {
      const ticker = normalizeEquityTicker(row.code);
      if (!ticker || names.has(ticker)) continue;
      names.set(ticker, row.name);
    }
  } catch {
    return names;
  }
  return names;
}

async function loadBseListed(
  auth: { cookie: string; crumb: string },
  quality?: QuoteQuality
): Promise<LargeCapStock[]> {
  for (const exchange of ["BSE", "BOM"]) {
    try {
      const stocks = await loadFromYahooScreener(
        auth,
        exchange,
        ".BO",
        "IN_BSE",
        0,
        quality
      );
      if (stocks.length > 0) return stocks;
    } catch {
      // Try the other Yahoo exchange code for BSE.
    }
  }
  return [];
}

/**
 * NSE and BSE equities priced above ₹150 with positive trailing earnings.
 * Large, mid, small, and micro caps all qualify when those two checks pass.
 * A name listed on both exchanges is kept once, on NSE.
 */
export async function loadIndianListedUniverse(): Promise<LargeCapStock[]> {
  const listed = await nseListedNames();
  const sme = await nseSmeNames();
  for (const [ticker, name] of sme) {
    if (!listed.has(ticker)) listed.set(ticker, name);
  }
  if (listed.size === 0) {
    throw new Error("Could not load the NSE stock list.");
  }

  const auth = await getYahooAuth();
  if (!auth) return [];

  let nse: LargeCapStock[] = [];
  try {
    nse = keepNseListed(
      await loadFromYahooScreener(
        auth,
        "NSI",
        ".NS",
        "IN_NSE",
        0,
        LISTED_QUOTE_QUALITY
      ),
      listed
    );
  } catch {
    nse = [];
  }

  let bse: LargeCapStock[] = [];
  try {
    bse = await loadBseListed(auth, LISTED_QUOTE_QUALITY);
  } catch {
    bse = [];
  }

  return mergeListings([...nse, ...bse]);
}
