import type { AssetClass } from "@/lib/journal-types";
import type { CurrencyCode } from "@/lib/settings";
import {
  fetchEodhdQuoteForTrade,
  isLiveMarketQuote,
  type EquityExchangeHint,
  type MarketQuote,
} from "@/lib/eodhd";
import type { ListingMarketId } from "@/lib/equity-listing-markets";
import {
  getListingMarket,
  normalizeListingMarket,
} from "@/lib/equity-listing-markets";
import { fetchYahooEquityQuote, fetchYahooEquityQuoteForMarket } from "@/lib/yahoo-equity-quote";

export type MarketQuoteContext = {
  equityExchange?: EquityExchangeHint;
  listingMarket?: ListingMarketId;
  /** Journal entry price — disambiguates US vs NSE tickers (e.g. RAIN). */
  entryPrice?: number;
  profileCurrency?: CurrencyCode;
};

function pickBetterQuote(
  primary: MarketQuote | null,
  alternate: MarketQuote | null
): MarketQuote | null {
  if (!alternate?.price) return primary;
  if (!primary?.price) return alternate;

  const primaryLive = isLiveMarketQuote(primary);
  const alternateLive = isLiveMarketQuote(alternate);
  if (alternateLive && !primaryLive) return alternate;
  if (primaryLive && !alternateLive) return primary;

  if (alternateLive && primaryLive) {
    const altTs = alternate.timestamp ?? 0;
    const priTs = primary.timestamp ?? 0;
    return altTs >= priTs ? alternate : primary;
  }

  if (alternate.price !== primary.price) {
    return alternate;
  }

  return primary;
}

/** Prefer listing whose price scale matches the trade entry (INR NSE vs US homonyms). */
function pickEquityYahooQuote(
  nse: MarketQuote | null,
  us: MarketQuote | null,
  ctx: MarketQuoteContext
): MarketQuote | null {
  const candidates = [nse, us].filter(
    (q): q is MarketQuote => q != null && q.price != null && q.price > 0
  );
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  const entry = ctx.entryPrice;
  if (entry != null && entry > 0) {
    let best = candidates[0];
    let bestDist = Math.abs(best.price! - entry) / entry;
    for (let i = 1; i < candidates.length; i++) {
      const q = candidates[i];
      const dist = Math.abs(q.price! - entry) / entry;
      if (dist < bestDist) {
        bestDist = dist;
        best = q;
      }
    }
    if (bestDist < 0.75) return best;
  }

  if (ctx.profileCurrency === "INR" || ctx.equityExchange === "NSE") {
    return nse ?? us;
  }

  const inr = nse?.currency === "INR" ? nse : null;
  const usd = us?.currency === "USD" ? us : null;
  if (inr && usd && entry != null && entry > 50 && (usd.price ?? 0) < entry * 0.2) {
    return inr;
  }

  return pickBetterQuote(us, nse);
}

/** EODHD first; Yahoo chart feed when EODHD only has stale close (common for NSE). */
export async function fetchMarketQuoteForTrade(
  ticker: string,
  assetClass: AssetClass,
  apiKey: string,
  equityExchange: EquityExchangeHint = "US",
  context: Omit<MarketQuoteContext, "equityExchange"> = {}
): Promise<MarketQuote | null> {
  const ctx: MarketQuoteContext = {
    ...context,
    equityExchange,
  };

  const listingMarket = context.listingMarket
    ? normalizeListingMarket(context.listingMarket)
    : undefined;
  const eodhdExchange =
    listingMarket != null
      ? getListingMarket(listingMarket).eodhdExchange
      : equityExchange;

  const eodhd = await fetchEodhdQuoteForTrade(
    ticker,
    assetClass,
    apiKey,
    eodhdExchange
  );

  if (eodhd && isLiveMarketQuote(eodhd)) {
    return eodhd;
  }

  if (assetClass !== "Equities") {
    return eodhd;
  }

  if (listingMarket) {
    const yahoo = await fetchYahooEquityQuoteForMarket(ticker, listingMarket);
    if (yahoo && isLiveMarketQuote(yahoo)) return yahoo;
    return pickBetterQuote(eodhd, yahoo);
  }

  const [nseQuote, usQuote] = await Promise.all([
    fetchYahooEquityQuote(ticker, "NSE"),
    fetchYahooEquityQuote(ticker, "US"),
  ]);

  const yahoo = pickEquityYahooQuote(nseQuote, usQuote, ctx);
  if (yahoo && isLiveMarketQuote(yahoo)) {
    return yahoo;
  }

  return pickBetterQuote(eodhd, yahoo);
}
