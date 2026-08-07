import { NextResponse, type NextRequest } from "next/server";

const MOBILE_DEEP_LINK = "swingtradinglog://auth/callback";

/** True when OAuth was started from the web app (PKCE verifier lives in cookies). */
export function hasWebOAuthCookies(request: NextRequest): boolean {
  return request.cookies.getAll().some(({ name }) => name.startsWith("sb-"));
}

/**
 * Mobile OAuth bridge — return 200 so the in-app browser hands the URL (with ?code=)
 * back to the native app, which exchanges the code using its own PKCE verifier.
 */
export function mobileOAuthBridgeResponse(request: NextRequest) {
  const deepLink = new URL(MOBILE_DEEP_LINK);
  for (const [key, value] of request.nextUrl.searchParams.entries()) {
    deepLink.searchParams.set(key, value);
  }
  const target = deepLink.toString();

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="refresh" content="0;url=${target.replace(/"/g, "&quot;")}" />
  <title>Returning to SwingTradingLog…</title>
  <style>
    body {
      font-family: system-ui, sans-serif;
      display: grid;
      place-items: center;
      min-height: 100vh;
      margin: 0;
      background: #0f1419;
      color: #e5e7eb;
    }
  </style>
</head>
<body>
  <p>Returning to SwingTradingLog…</p>
  <script>location.replace(${JSON.stringify(target)});</script>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
