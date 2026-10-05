import { isAdminUser } from "@/lib/admin";
import { screenerJson, screenerNdjsonStream } from "@/lib/screener/http";
import { loadAllMomentumSetups } from "@/lib/screener/load-momentum-setups";
import { getCurrentUser } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const maxDuration = 120;

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || !isAdminUser(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const fresh = url.searchParams.get("fresh") === "1";
  const stream = url.searchParams.get("stream") === "1";

  if (stream) {
    return screenerNdjsonStream((onProgress) =>
      loadAllMomentumSetups(fresh, onProgress)
    );
  }

  const payload = await loadAllMomentumSetups(fresh);
  return screenerJson(payload);
}
