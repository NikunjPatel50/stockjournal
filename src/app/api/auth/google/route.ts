import { NextResponse, type NextRequest } from "next/server";
import { AUTH_NEXT_COOKIE, AUTH_NEXT_MAX_AGE, sanitizeAuthNextPath } from "@/lib/auth-next";
import { GOOGLE_OAUTH_HINT_COOKIE } from "@/lib/google-oauth-hint";
import { createSupabaseOAuthRouteClient } from "@/lib/supabase/route-client";

export async function GET(request: NextRequest) {
  const pickAccount = request.nextUrl.searchParams.get("pick_account") === "1";
  const loginHint = request.cookies.get(GOOGLE_OAUTH_HINT_COOKIE)?.value?.trim();
  const authNext = sanitizeAuthNextPath(
    request.nextUrl.searchParams.get("next")
  );

  const { supabase, applyCookiesTo } = createSupabaseOAuthRouteClient(request);

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

  const response = NextResponse.redirect(data.url);
  applyCookiesTo(response);

  if (authNext) {
    response.cookies.set(AUTH_NEXT_COOKIE, authNext, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: AUTH_NEXT_MAX_AGE,
    });
  }

  return response;
}
