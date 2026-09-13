import { isAdminUser } from "@/lib/admin";
import { screenerJson } from "@/lib/screener/http";
import { loadAllTurtleBreakouts } from "@/lib/screener/load-turtle-breakouts";
import { getCurrentUser } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const maxDuration = 120;

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || !isAdminUser(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const fresh = new URL(request.url).searchParams.get("fresh") === "1";
  const payload = await loadAllTurtleBreakouts(fresh);
  return screenerJson(payload);
}
