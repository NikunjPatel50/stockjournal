import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { oauthUserNeedsEmailVerification } from "@/lib/auth-oauth";
import {
  GOOGLE_OAUTH_HINT_COOKIE,
  GOOGLE_OAUTH_HINT_MAX_AGE,
} from "@/lib/google-oauth-hint";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";
import { mapSupabaseUser } from "@/lib/supabase/types";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const oauthError = request.nextUrl.searchParams.get("error");

  if (oauthError || !code) {
    return NextResponse.redirect(
      new URL("/login?error=oauth_failed", request.url)
    );
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    return NextResponse.redirect(
      new URL("/login?error=exchange_failed", request.url)
    );
  }

  const user = mapSupabaseUser(data.user);
  const successResponse = NextResponse.redirect(
    new URL("/dashboard", request.url)
  );

  if (user.email) {
    successResponse.cookies.set(GOOGLE_OAUTH_HINT_COOKIE, user.email, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: GOOGLE_OAUTH_HINT_MAX_AGE,
    });
  }

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

    return NextResponse.redirect(verifyUrl);
  }

  return successResponse;
}
