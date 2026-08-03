import { NextResponse } from "next/server";
import { z } from "zod";
import { LISTING_MARKET_IDS } from "@/lib/equity-listing-markets";
import { getCurrentUser } from "@/lib/supabase/server";
import { fetchFundamentalsBatch } from "@/lib/yahoo-fundamentals";

const requestSchema = z.object({
  symbols: z.array(
    z.object({
      ticker: z.string().min(1),
      assetClass: z.enum(["Equities", "Options", "Crypto", "Forex"]),
      listingMarket: z.enum(LISTING_MARKET_IDS).optional(),
    })
  ),
});

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

  const fundamentals = await fetchFundamentalsBatch(
    parsed.data.symbols.map((symbol) => ({
      ticker: symbol.ticker,
      assetClass: symbol.assetClass,
      listingMarket: symbol.listingMarket ?? "US",
    }))
  );

  return NextResponse.json({ fundamentals });
}
