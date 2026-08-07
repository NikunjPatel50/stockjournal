import { NextResponse, type NextRequest } from "next/server";
import { oauthUserNeedsEmailVerification } from "@/lib/auth-oauth";
import {
  AUTH_NEXT_COOKIE,
  sanitizeAuthNextPath,
} from "@/lib/auth-next";
import {
  GOOGLE_OAUTH_HINT_COOKIE,
  GOOGLE_OAUTH_HINT_MAX_AGE,
} from "@/lib/google-oauth-hint";
import {
  hasWebOAuthCookies,
  mobileOAuthBridgeResponse,
} from "@/lib/mobile-oauth-bridge";
import { createSupabaseOAuthRouteClient } from "@/lib/supabase/route-client";
import { mapSupabaseUser } from "@/lib/supabase/types";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const oauthError = request.nextUrl.searchParams.get("error");

  if (oauthError || !code) {
    return NextResponse.redirect(
      new URL("/login?error=oauth_failed", request.url)
    );
  }

  // Native app OAuth: no web PKCE cookies — hand code back to the app instead of
  // exchanging server-side (which fails and strands the user on the web login page).
  if (!hasWebOAuthCookies(request)) {
    return mobileOAuthBridgeResponse(request);
  }

  const { supabase, applyCookiesTo } = createSupabaseOAuthRouteClient(request);

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    console.error("[oauth] exchange failed:", error?.message);
    return NextResponse.redirect(
      new URL("/login?error=exchange_failed", request.url)
    );
  }

  const user = mapSupabaseUser(data.user);
  const needsVerification = oauthUserNeedsEmailVerification(user);

  if (user.email && needsVerification) {
    try {
      await supabase.auth.resend({ type: "signup", email: user.email });
    } catch (err) {
      console.error("[oauth] resend verification failed:", err);
    }

    await supabase.auth.signOut();

    const verifyUrl = new URL("/login", request.url);
    verifyUrl.searchParams.set("verify", user.email);
    verifyUrl.searchParams.set("oauth", "1");
    verifyUrl.searchParams.set(
      "message",
      "Enter the 6-digit code we emailed you to finish creating your account."
    );

    const response = NextResponse.redirect(verifyUrl);
    applyCookiesTo(response);
    return response;
  }

  const authNext = sanitizeAuthNextPath(
    request.cookies.get(AUTH_NEXT_COOKIE)?.value
  );

  const response = NextResponse.redirect(
    new URL(authNext ?? "/dashboard", request.url)
  );
  applyCookiesTo(response);
  response.cookies.delete(AUTH_NEXT_COOKIE);

  if (user.email) {
    response.cookies.set(GOOGLE_OAUTH_HINT_COOKIE, user.email, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: GOOGLE_OAUTH_HINT_MAX_AGE,
    });
  }

  return response;
}
