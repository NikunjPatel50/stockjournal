import { NextResponse, type NextRequest } from "next/server";

const MOBILE_DEEP_LINK = "swingtradinglog://auth/callback";

/**
 * OAuth landing for the native app. Forwards auth params into the app scheme
 * without exchanging the code server-side (the app exchanges locally).
 */
export async function GET(request: NextRequest) {
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
  <title>Opening SwingTradingLog…</title>
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
  <p>Opening SwingTradingLog…</p>
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
