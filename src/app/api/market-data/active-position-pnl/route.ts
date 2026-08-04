import { NextResponse } from "next/server";
import { z } from "zod";
import {
  computeActivePositionDailyPnl,
  buildPriorSessionBarByTradeId,
  type ActivePositionPnlInput,
} from "@/lib/active-position-daily-pnl";
import {
  defaultListingMarketForCurrency,
  LISTING_MARKET_IDS,
} from "@/lib/equity-listing-markets";
import { defaultEquityExchangeForCurrency } from "@/lib/eodhd";
import { fetchDailyBarsCached } from "@/lib/daily-bars-cache";
import { fetchMarketQuoteForTrade } from "@/lib/market-quote";
import { mapWithConcurrency } from "@/lib/map-with-concurrency";
import { getCurrentUser } from "@/lib/supabase/server";
import { getMarketDataProvider } from "@/lib/trade-pulse/providers";
import type { CurrencyCode } from "@/lib/settings";
import { DEFAULT_CURRENCY } from "@/lib/settings";

const tradeSchema = z.object({
  id: z.string().min(1),
  ticker: z.string().min(1),
  direction: z.enum(["Long", "Short"]),
  quantity: z.number().positive(),
  entryPrice: z.number().positive(),
  entryDate: z.string().min(1),
  assetClass: z.enum(["Equities", "Options", "Crypto", "Forex"]),
  listingMarket: z.enum(LISTING_MARKET_IDS).optional(),
  fees: z.number().optional(),
});

const requestSchema = z.object({
  trades: z.array(tradeSchema).max(40),
  currency: z.enum(["USD", "EUR", "GBP", "INR", "CAD"]).optional(),
});

export const maxDuration = 30;

const FETCH_CONCURRENCY = 6;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const currency = (parsed.data.currency ?? DEFAULT_CURRENCY) as CurrencyCode;
  const trades = parsed.data.trades.filter(
    (trade) => trade.assetClass === "Equities"
  ) as ActivePositionPnlInput[];

  if (trades.length === 0) {
    return NextResponse.json({ daily: [] });
  }

  const apiKey = process.env.EODHD_API_KEY?.trim();
  const equityExchange = defaultEquityExchangeForCurrency(currency);
  const provider = getMarketDataProvider();
  const barsByTradeId: Record<
    string,
    Awaited<ReturnType<typeof provider.fetchDailyBars>>
  > = {};
  const quotesByTradeId: Record<
    string,
    { price: number; changePercent: number | null }
  > = {};

  await mapWithConcurrency(trades, FETCH_CONCURRENCY, async (trade) => {
    const listingMarket =
      trade.listingMarket ?? defaultListingMarketForCurrency(currency);

    const [bars, quote] = await Promise.all([
      fetchDailyBarsCached(trade.ticker, listingMarket, () =>
        provider
          .fetchDailyBars(trade.ticker, listingMarket)
          .catch(
            () => [] as Awaited<ReturnType<typeof provider.fetchDailyBars>>
          )
      ),
      apiKey
        ? fetchMarketQuoteForTrade(
            trade.ticker,
            "Equities",
            apiKey,
            equityExchange,
            {
              entryPrice: trade.entryPrice,
              profileCurrency: currency,
              listingMarket,
            }
          ).catch(() => null)
        : Promise.resolve(null),
    ]);

    barsByTradeId[trade.id] = bars;
    if (quote?.price != null && quote.price > 0) {
      quotesByTradeId[trade.id] = {
        price: quote.price,
        changePercent: quote.changePercent,
      };
    }
  });

  const daily = computeActivePositionDailyPnl(trades, barsByTradeId, {
    asOf: new Date(),
    currency,
    quotesByTradeId,
  });

  const asOf = new Date();
  const priorSessionBarByTradeId = buildPriorSessionBarByTradeId(
    trades,
    barsByTradeId,
    currency,
    asOf
  );

  return NextResponse.json({
    daily,
    priorSessionBarByTradeId,
    asOf: Date.now(),
  });
}
