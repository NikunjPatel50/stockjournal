import { NextResponse } from "next/server";
import { getFreshNseSymbolDirectory } from "@/lib/nse-symbol-directory";
import { getCurrentUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const symbols = await getFreshNseSymbolDirectory();

  return NextResponse.json(
    {
      symbols,
      count: symbols.length,
      updatedAt: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "private, max-age=3600",
      },
    }
  );
}
