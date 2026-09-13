import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/admin";
import { screenerJson } from "@/lib/screener/http";
import { loadSectorStocks } from "@/lib/screener/load-screener";
import { getCurrentUser } from "@/lib/supabase/server";

export const maxDuration = 60;

export async function GET(
  request: Request,
  context: { params: Promise<{ sectorId: string }> }
) {
  const user = await getCurrentUser();
  if (!user || !isAdminUser(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { sectorId } = await context.params;
  const fresh = new URL(request.url).searchParams.get("fresh") === "1";
  const payload = await loadSectorStocks(sectorId, fresh);
  if (!payload) {
    return NextResponse.json({ error: "Sector not found" }, { status: 404 });
  }

  return screenerJson(payload);
}
