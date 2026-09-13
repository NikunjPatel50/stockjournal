import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/admin";
import { screenerJson } from "@/lib/screener/http";
import { loadStockDetail } from "@/lib/screener/load-screener";
import { getCurrentUser } from "@/lib/supabase/server";

export const maxDuration = 60;

export async function GET(
  request: Request,
  context: { params: Promise<{ ticker: string }> }
) {
  const user = await getCurrentUser();
  if (!user || !isAdminUser(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { ticker } = await context.params;
  const sectorId = new URL(request.url).searchParams.get("sectorId");
  const payload = await loadStockDetail(ticker, sectorId);
  if (!payload) {
    return NextResponse.json({ error: "Stock not found" }, { status: 404 });
  }

  return screenerJson(payload);
}
