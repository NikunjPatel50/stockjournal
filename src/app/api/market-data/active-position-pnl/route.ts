import { NextResponse } from "next/server";
import { z } from "zod";
import {
  computeActivePositionDailyPnl,
  type ActivePositionPnlInput,
} from "@/lib/active-position-daily-pnl";
import { LISTING_MARKET_IDS } from "@/lib/equity-listing-markets";
import { defaultListingMarketForCurrency } from "@/lib/equity-listing-markets";
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
});

const requestSchema = z.object({
  trades: z.array(tradeSchema).max(40),
  currency: z.enum(["USD", "EUR", "GBP", "INR", "CAD"]).optional(),
});

export const maxDuration = 30;

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

  const provider = getMarketDataProvider();
  const barsByTradeId: Record<string, Awaited<ReturnType<typeof provider.fetchDailyBars>>> = {};

  await Promise.all(
    trades.map(async (trade) => {
      const listingMarket =
        trade.listingMarket ?? defaultListingMarketForCurrency(currency);
      try {
        barsByTradeId[trade.id] = await provider.fetchDailyBars(
          trade.ticker,
          listingMarket
        );
      } catch {
        barsByTradeId[trade.id] = [];
      }
    })
  );

  const daily = computeActivePositionDailyPnl(trades, barsByTradeId, {
    asOf: new Date(),
    currency,
  });

  return NextResponse.json({ daily, asOf: Date.now() });
}
