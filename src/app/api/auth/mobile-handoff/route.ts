import { createClient } from "@insforge/sdk";
import { setAuthCookies } from "@insforge/sdk/ssr";
import { NextResponse } from "next/server";

/**
 * Establishes the same InsForge session cookies as the web app for in-app WebViews.
 * Called from the native app with the mobile refresh token (HTTPS only).
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const refreshToken =
    typeof body === "object" &&
    body !== null &&
    "refreshToken" in body &&
    typeof (body as { refreshToken: unknown }).refreshToken === "string"
      ? (body as { refreshToken: string }).refreshToken.trim()
      : "";

  if (!refreshToken) {
    return NextResponse.json(
      { ok: false, error: "refreshToken is required" },
      { status: 400 }
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;
  const anonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY;
  if (!baseUrl || !anonKey) {
    return NextResponse.json(
      { ok: false, error: "Server auth is not configured" },
      { status: 500 }
    );
  }

  const client = createClient({
    baseUrl,
    anonKey,
    isServerMode: true,
  });

  const { data, error } = await client.auth.refreshSession({ refreshToken });
  if (error || !data?.accessToken) {
    return NextResponse.json(
      { ok: false, error: "Invalid or expired session" },
      { status: 401 }
    );
  }

  const response = NextResponse.json({ ok: true });
  setAuthCookies(response.cookies, {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken ?? refreshToken,
  });

  return response;
}
