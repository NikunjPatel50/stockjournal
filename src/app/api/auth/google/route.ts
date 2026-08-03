import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { GOOGLE_OAUTH_HINT_COOKIE } from "@/lib/google-oauth-hint";
import { createSupabaseRouteClient } from "@/lib/supabase/route-client";

export async function GET(request: NextRequest) {
  const pickAccount = request.nextUrl.searchParams.get("pick_account") === "1";
  const cookieStore = await cookies();
  const loginHint = cookieStore.get(GOOGLE_OAUTH_HINT_COOKIE)?.value?.trim();

  const supabase = await createSupabaseRouteClient();

  const queryParams: Record<string, string> = {};
  if (pickAccount) {
    queryParams.prompt = "select_account";
  } else if (loginHint) {
    queryParams.login_hint = loginHint;
  }

  const redirectTo = new URL("/api/auth/callback", request.nextUrl.origin).toString();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      ...(Object.keys(queryParams).length > 0 ? { queryParams } : {}),
    },
  });

  if (error || !data?.url) {
    console.error("[oauth] init failed:", error?.message);
    return NextResponse.redirect(
      new URL("/login?error=oauth_failed", request.url)
    );
  }

  return NextResponse.redirect(data.url);
}
