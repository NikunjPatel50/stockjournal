import { NextResponse } from "next/server";
import { fetchBenchmarkHistory } from "@/lib/benchmark-return";
import type { PortfolioChartTimeframe } from "@/lib/portfolio-timeline";
import { getCurrentUser } from "@/lib/supabase/server";

const VALID_TIMEFRAMES = new Set<PortfolioChartTimeframe>([
  "1d",
  "3d",
  "7d",
  "15d",
  "1m",
  "6m",
  "1y",
  "3y",
  "5y",
  "all",
]);

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const indexId = searchParams.get("indexId") ?? "nifty50";
  const timeframe = searchParams.get("timeframe") ?? "1y";
  const anchorValue = Number(searchParams.get("anchorValue") ?? "1");

  if (!VALID_TIMEFRAMES.has(timeframe as PortfolioChartTimeframe)) {
    return NextResponse.json({ error: "Invalid timeframe" }, { status: 400 });
  }

  const history = await fetchBenchmarkHistory(
    indexId,
    timeframe as PortfolioChartTimeframe,
    Number.isFinite(anchorValue) && anchorValue > 0 ? anchorValue : 1
  );

  return NextResponse.json({
    indexId,
    timeframe,
    xirr: history.xirr,
    periodReturn: history.periodReturn,
    points: history.points,
  });
}
