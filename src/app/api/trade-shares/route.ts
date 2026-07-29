import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/insforge/server";
import {
  createShareTradeToken,
  tradeToSharePayload,
  type ShareableTradePayload,
} from "@/lib/share-trade";

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

  const trade = body as Record<string, unknown>;
  if (trade.status === "Active" || trade.status === "open") {
    return NextResponse.json(
      { error: "Only closed trades can be shared" },
      { status: 400 }
    );
  }

  const payload: ShareableTradePayload = tradeToSharePayload({
    ticker: String(trade.ticker ?? ""),
    direction: trade.direction === "Short" ? "Short" : "Long",
    entryPrice: Number(trade.entryPrice),
    exitPrice: Number(trade.exitPrice),
    roi: Number(trade.roi),
    pnl: Number(trade.pnl),
    holdTimeHours: Number(trade.holdTimeHours),
    outcome:
      trade.outcome === "Win" || trade.outcome === "Loss"
        ? trade.outcome
        : "Breakeven",
    strategy: String(trade.strategy ?? ""),
    plannedRisk: Number(trade.plannedRisk ?? 0),
  });

  if (!payload.ticker || !Number.isFinite(payload.entryPrice)) {
    return NextResponse.json({ error: "Invalid trade payload" }, { status: 400 });
  }

  const token = await createShareTradeToken(payload);
  return NextResponse.json({ token });
}
