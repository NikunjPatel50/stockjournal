import { NextResponse } from "next/server";
import { normalizeListingMarket } from "@/lib/equity-listing-markets";
import { getCurrentUser } from "@/lib/supabase/server";
import { getPositionMarketData } from "@/lib/trade-pulse/market-data";

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

  const payload = body as {
    ticker?: string;
    listingMarket?: string;
    entryDate?: string;
  };

  const ticker = String(payload.ticker ?? "").trim();
  if (!ticker) {
    return NextResponse.json({ error: "ticker is required" }, { status: 400 });
  }

  const listingMarket = payload.listingMarket
    ? normalizeListingMarket(payload.listingMarket)
    : undefined;
  const entryDate =
    typeof payload.entryDate === "string" && payload.entryDate.trim()
      ? payload.entryDate.trim()
      : new Date().toISOString();

  try {
    const data = await getPositionMarketData(ticker, entryDate, {
      listingMarket,
    });

    if (!data) {
      return NextResponse.json(
        { error: "Could not load market data for this symbol." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ticker: data.ticker,
      atr14: data.atr14,
      lastClose: data.today.close,
      provider: data.provider,
      asOf: data.asOf,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not load ATR data";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
