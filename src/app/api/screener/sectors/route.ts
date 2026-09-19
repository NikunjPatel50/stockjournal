import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/admin";
import { screenerJson, screenerNdjsonStream } from "@/lib/screener/http";
import { loadSectorRows } from "@/lib/screener/load-screener";
import { warmStrategyCaches } from "@/lib/screener/load-strategy-scans";
import { getCurrentUser } from "@/lib/supabase/server";

export const maxDuration = 120;

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || !isAdminUser(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const fresh = url.searchParams.get("fresh") === "1";
  const stream = url.searchParams.get("stream") === "1";

  if (stream && fresh) {
    return screenerNdjsonStream(async (onProgress) => {
      const payload = await loadSectorRows(true, onProgress);
      warmStrategyCaches();
      return payload;
    });
  }

  const payload = await loadSectorRows(fresh);
  warmStrategyCaches();
  return screenerJson(payload);
}
