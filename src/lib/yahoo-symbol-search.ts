import {
  getListingMarket,
  type ListingMarketId,
} from "@/lib/equity-listing-markets";
import type { EodhdSymbolSearchHit } from "@/lib/eodhd-symbol-search";
import { normalizeEquityTicker } from "@/lib/ticker-normalize";

type YahooSearchQuote = {
  symbol?: string;
  shortname?: string;
  longname?: string;
  quoteType?: string;
  exchange?: string;
  exchDisp?: string;
};

function normalizeYahooExchange(
  exchange?: string,
  exchDisp?: string
): string {
  const raw = `${exchDisp ?? ""} ${exchange ?? ""}`.trim().toUpperCase();
  if (raw.includes("NSE") || raw === "NSI") return "NSE";
  if (raw.includes("BOMBAY") || raw === "BSE") return "BSE";
  if (raw.includes("NASDAQ") || raw.includes("NYSE") || raw === "NMS" || raw === "NYQ") {
    return "US";
  }
  if (raw.includes("LSE") || raw === "LON") return "LSE";
  if (raw.includes("TORONTO") || raw === "TOR") return "TO";
  return (exchDisp ?? exchange ?? "US").trim().toUpperCase();
}

function codeFromYahooSymbol(symbol: string, suffix: string): string {
  const upper = symbol.trim().toUpperCase();
  if (suffix && upper.endsWith(suffix.toUpperCase())) {
    return upper.slice(0, -suffix.length);
  }
  return normalizeEquityTicker(symbol.split(".")[0] ?? symbol);
}

function exchangeForListingMarket(
  listingMarket: ListingMarketId,
  detected: string
): string {
  switch (listingMarket) {
    case "IN_NSE":
      return "NSE";
    case "IN_BSE":
      return "BSE";
    case "US":
      return "US";
    case "UK":
      return "LSE";
    case "CA":
      return "TO";
    case "DE":
      return "XETRA";
    case "FR":
      return "PA";
    case "NL":
      return "AS";
    case "CH":
      return "SW";
    case "HK":
      return "HK";
    case "AU":
      return "AU";
    case "JP":
      return "T";
    case "KR":
      return "KO";
    case "SG":
      return "SI";
    case "BR":
      return "SA";
    case "MX":
      return "MX";
    default:
      return detected;
  }
}

function yahooQuoteMatchesMarket(
  symbol: string,
  listingMarket: ListingMarketId,
  suffix: string
): boolean {
  const upper = symbol.trim().toUpperCase();
  if (suffix) return upper.endsWith(suffix.toUpperCase());

  if (listingMarket === "US") {
    return !upper.includes(".") || upper.endsWith(".US");
  }

  return true;
}

/** Yahoo Finance symbol search (reliable for NSE/BSE and global equities). */
export async function searchYahooSymbols(
  query: string,
  listingMarket: ListingMarketId,
  limit = 12
): Promise<EodhdSymbolSearchHit[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const suffix = getListingMarket(listingMarket).yahooSuffix;
  const queries = new Set<string>([trimmed]);
  if (suffix && !trimmed.toUpperCase().endsWith(suffix.toUpperCase())) {
    const base = normalizeEquityTicker(trimmed.split(".")[0] ?? trimmed);
    if (base) queries.add(`${base}${suffix}`);
  }

  const quoteMap = new Map<string, YahooSearchQuote>();
  for (const q of queries) {
    const quotes = await fetchYahooSearchQuotes(q);
    for (const quote of quotes) {
      if (quote.symbol) quoteMap.set(quote.symbol.toUpperCase(), quote);
    }
  }

  return [...quoteMap.values()]
    .filter(
      (quote) =>
        quote.symbol &&
        (quote.quoteType === "EQUITY" || quote.quoteType === "ETF")
    )
    .filter((quote) =>
      yahooQuoteMatchesMarket(quote.symbol!, listingMarket, suffix)
    )
    .map((quote) => ({
      code: codeFromYahooSymbol(quote.symbol!, suffix),
      name: (quote.longname || quote.shortname || quote.symbol!).trim(),
      exchange: exchangeForListingMarket(
        listingMarket,
        normalizeYahooExchange(quote.exchange, quote.exchDisp)
      ),
      type: quote.quoteType ?? "Equity",
      currency: null,
    }))
    .slice(0, limit);
}

async function fetchYahooSearchQuotes(
  query: string
): Promise<YahooSearchQuote[]> {
  const url = new URL("https://query1.finance.yahoo.com/v1/finance/search");
  url.searchParams.set("q", query);
  url.searchParams.set("quotesCount", "20");
  url.searchParams.set("newsCount", "0");

  try {
    const res = await fetch(url.toString(), {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; SwingTradingLog/1.0)",
      },
    });
    if (!res.ok) return [];

    const data = (await res.json()) as { quotes?: YahooSearchQuote[] };
    return data.quotes ?? [];
  } catch {
    return [];
  }
}
