import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminUser } from "@/lib/admin";
import { parseOptionsScreenshot } from "@/lib/options-screenshot-parse";
import { getCurrentUser } from "@/lib/supabase/server";

export const maxDuration = 60;

const bodySchema = z.object({
  image: z.string().min(32).max(7_000_000),
});

export async function POST(request: Request) {
  const [user, bodyResult] = await Promise.all([
    getCurrentUser(),
    request
      .json()
      .then((raw) => bodySchema.safeParse(raw))
      .catch(() => null),
  ]);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdminUser(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!bodyResult?.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const body = bodyResult.data;

  if (!body.image.startsWith("data:image/")) {
    return NextResponse.json({ error: "Image must be a data URL" }, { status: 400 });
  }

  try {
    const parsed = await parseOptionsScreenshot(body.image);
    return NextResponse.json({ ok: true, parsed });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Screenshot parse failed";
    console.error("[options/parse-screenshot]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
