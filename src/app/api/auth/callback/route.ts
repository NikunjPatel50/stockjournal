import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@insforge/sdk";
import { createAuthActions } from "@insforge/sdk/ssr";
import { oauthUserNeedsEmailVerification } from "@/lib/auth-oauth";
import {
  GOOGLE_OAUTH_HINT_COOKIE,
  GOOGLE_OAUTH_HINT_MAX_AGE,
} from "@/lib/google-oauth-hint";

function appLoginUrl(request: NextRequest, path: string) {
  return new URL(path, request.url).toString();
}

async function sendVerificationCode(email: string, request: NextRequest) {
  const anon = createClient({
    baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL,
    anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY,
  });
  await anon.auth.resendVerificationEmail({
    email,
    redirectTo: appLoginUrl(request, "/login"),
  });
}

function redirectToVerifyEmail(
  request: NextRequest,
  email: string,
  sessionResponse: NextResponse,
  options: { message: string; oauth?: boolean }
) {
  const verifyUrl = new URL("/login", request.url);
  verifyUrl.searchParams.set("verify", email);
  verifyUrl.searchParams.set("message", options.message);
  if (options.oauth) {
    verifyUrl.searchParams.set("oauth", "1");
  }

  const verifyResponse = NextResponse.redirect(verifyUrl);

  for (const cookie of sessionResponse.cookies.getAll()) {
    verifyResponse.cookies.set(cookie.name, "", {
      path: "/",
      maxAge: 0,
    });
  }
  verifyResponse.cookies.delete("insforge_code_verifier");

  return verifyResponse;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("insforge_code");
  const oauthError = request.nextUrl.searchParams.get("error");

  if (oauthError || !code) {
    return NextResponse.redirect(
      new URL("/login?error=oauth_failed", request.url)
    );
  }

  const cookieStore = await cookies();
  const codeVerifier = cookieStore.get("insforge_code_verifier")?.value;
  if (!codeVerifier) {
    return NextResponse.redirect(
      new URL("/login?error=missing_verifier", request.url)
    );
  }

  const successResponse = NextResponse.redirect(
    new URL("/dashboard", request.url)
  );
  const auth = createAuthActions({
    requestCookies: request.cookies,
    responseCookies: successResponse.cookies,
  });

  const { data, error } = await auth.exchangeOAuthCode(code, codeVerifier);
  if (error || !data?.user) {
    return NextResponse.redirect(
      new URL("/login?error=exchange_failed", request.url)
    );
  }

  successResponse.cookies.delete("insforge_code_verifier");

  const exchangePayload = data as Record<string, unknown>;
  const email = data.user.email;

  if (email) {
    successResponse.cookies.set(GOOGLE_OAUTH_HINT_COOKIE, email, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: GOOGLE_OAUTH_HINT_MAX_AGE,
    });
  }
  const needsVerification = oauthUserNeedsEmailVerification(
    data.user,
    exchangePayload
  );

  if (email && needsVerification) {
    try {
      await sendVerificationCode(email, request);
    } catch (err) {
      console.error("[oauth] resend verification failed:", err);
    }

    const signOutResponse = redirectToVerifyEmail(
      request,
      email,
      successResponse,
      {
        oauth: true,
        message:
          "Enter the 6-digit code we emailed you to finish creating your account.",
      }
    );

    const signOutAuth = createAuthActions({
      requestCookies: request.cookies,
      responseCookies: signOutResponse.cookies,
    });
    await signOutAuth.signOut();

    return signOutResponse;
  }

  return successResponse;
}
