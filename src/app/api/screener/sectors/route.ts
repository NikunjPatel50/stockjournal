import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/admin";
import { screenerJson } from "@/lib/screener/http";
import { loadSectorRows } from "@/lib/screener/load-screener";
import { warmStrategyCaches } from "@/lib/screener/load-strategy-scans";
import { getCurrentUser } from "@/lib/supabase/server";

export const maxDuration = 60;

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || !isAdminUser(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const fresh = new URL(request.url).searchParams.get("fresh") === "1";
  const payload = await loadSectorRows(fresh);
  warmStrategyCaches();
  return screenerJson(payload);
}
