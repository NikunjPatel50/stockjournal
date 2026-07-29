import { NextResponse, type NextRequest } from "next/server";
import {
  updateSession,
  type CookieStore,
} from "@insforge/sdk/ssr/middleware";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/robots.txt",
  "/sitemap.xml",
  "/changelog",
  "/blog",
  "/trading-guides",
  "/risk-calculator",
  "/privacy",
  "/terms",
];

function isPublicPath(pathname: string) {
  return (
    PUBLIC_PATHS.some((path) =>
      path === "/"
        ? pathname === "/"
        : pathname === path || pathname.startsWith(`${path}/`)
    ) ||
    pathname.startsWith("/share/") ||
    pathname.startsWith("/api/trade-card/") ||
    pathname.startsWith("/api/auth/")
  );
}

function asCookieStore(
  cookies: NextRequest["cookies"] | NextResponse["cookies"]
): CookieStore {
  return {
    get(name: string) {
      return cookies.get(name);
    },
    set(nameOrOptions: string | { name: string; value: string }, value?: string, options?: object) {
      if (typeof nameOrOptions === "string") {
        cookies.set(nameOrOptions, value ?? "", options);
        return;
      }
      cookies.set(nameOrOptions.name, nameOrOptions.value, nameOrOptions);
    },
    delete(nameOrOptions: string | { name: string }) {
      if (typeof nameOrOptions === "string") {
        cookies.delete(nameOrOptions);
        return;
      }
      cookies.delete(nameOrOptions.name);
    },
  } as CookieStore;
}

function withNoIndex(response: NextResponse) {
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });

  const { accessToken } = await updateSession({
    requestCookies: asCookieStore(request.cookies),
    responseCookies: asCookieStore(response.cookies),
  });

  const { pathname } = request.nextUrl;

  if (!accessToken && !isPublicPath(pathname)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return withNoIndex(NextResponse.redirect(loginUrl));
  }

  if (accessToken && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (!isPublicPath(pathname)) {
    return withNoIndex(response);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
