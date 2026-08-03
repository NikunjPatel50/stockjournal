import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { runTradePulseForUser } from "@/lib/trade-pulse/run-daily-job";

export const maxDuration = 120;

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runTradePulseForUser(user.id);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Trade Pulse generation failed";
    console.error("[trade-pulse/run]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
