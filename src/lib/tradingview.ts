import type { AssetClass, JournalTrade } from "@/lib/journal-types";
import {
  defaultListingMarketForCurrency,
  normalizeListingMarket,
  type ListingMarketId,
} from "@/lib/equity-listing-markets";
import { normalizeEquityTicker } from "@/lib/ticker-normalize";
import type { CurrencyCode } from "@/lib/settings";
import { DEFAULT_CURRENCY } from "@/lib/settings";

/** TradingView exchange prefixes for equity listing markets. */
const EQUITY_TV_EXCHANGE: Record<ListingMarketId, string> = {
  US: "",
  IN_NSE: "NSE",
  IN_BSE: "BSE",
  UK: "LSE",
  CA: "TSX",
  DE: "XETR",
  FR: "EURONEXT",
  NL: "EURONEXT",
  CH: "SIX",
  HK: "HKEX",
  AU: "ASX",
  JP: "TSE",
  KR: "KRX",
  SG: "SGX",
  BR: "BMFBOVESPA",
  MX: "BMV",
};

function stripYahooSuffix(ticker: string): string {
  return ticker.replace(
    /\.(NS|BO|L|TO|DE|PA|AS|SW|HK|AX|T|KS|SI|SA|MX)$/i,
    ""
  );
}

function cleanTicker(ticker: string): string {
  return stripYahooSuffix(normalizeEquityTicker(ticker)).replace(/[:/]/g, "");
}

function forexPairSymbol(ticker: string): string | null {
  const raw = ticker.trim().toUpperCase().replace(/[^A-Z]/g, "");
  if (raw.length === 6) return `FX:${raw}`;
  if (raw.length === 7 && raw.endsWith("X")) {
    // e.g. EURUSDX
    return `FX:${raw.slice(0, 6)}`;
  }
  return raw ? `FX_IDC:${raw}` : null;
}

function cryptoSymbol(ticker: string): string | null {
  const raw = ticker.trim().toUpperCase().replace(/^\$/, "");
  if (!raw) return null;
  // Prefer a common USD pair when only a base asset is stored.
  if (/^[A-Z0-9]+$/.test(raw) && !raw.includes("USD") && raw.length <= 5) {
    return `BINANCE:${raw}USDT`;
  }
  const pair = raw.replace(/[^A-Z0-9]/g, "");
  return pair ? `BINANCE:${pair}` : null;
}

export function tradingViewSymbolForTrade(
  trade: Pick<JournalTrade, "ticker" | "assetClass" | "listingMarket">,
  displayCurrency: CurrencyCode = DEFAULT_CURRENCY
): string | null {
  const assetClass: AssetClass = trade.assetClass ?? "Equities";
  const ticker = trade.ticker?.trim();
  if (!ticker) return null;

  if (assetClass === "Forex") return forexPairSymbol(ticker);
  if (assetClass === "Crypto") return cryptoSymbol(ticker);

  // Equities / options — chart the listed symbol (or underlying ticker).
  const symbol = cleanTicker(ticker);
  if (!symbol) return null;

  const listingMarket = normalizeListingMarket(
    trade.listingMarket ?? defaultListingMarketForCurrency(displayCurrency)
  );
  const exchange = EQUITY_TV_EXCHANGE[listingMarket] ?? "";
  return exchange ? `${exchange}:${symbol}` : symbol;
}

/** Daily chart URL on TradingView for a journal trade. */
export function tradingViewDailyChartUrl(
  trade: Pick<JournalTrade, "ticker" | "assetClass" | "listingMarket">,
  displayCurrency: CurrencyCode = DEFAULT_CURRENCY
): string | null {
  const symbol = tradingViewSymbolForTrade(trade, displayCurrency);
  if (!symbol) return null;
  const params = new URLSearchParams({
    symbol,
    interval: "D",
  });
  return `https://www.tradingview.com/chart/?${params.toString()}`;
}

export function openTradingViewDailyChart(
  trade: Pick<JournalTrade, "ticker" | "assetClass" | "listingMarket">,
  displayCurrency: CurrencyCode = DEFAULT_CURRENCY
): boolean {
  const url = tradingViewDailyChartUrl(trade, displayCurrency);
  if (!url || typeof window === "undefined") return false;
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}
