/** Routes reachable without signing in (keep in sync with src/proxy.ts). */
export const PUBLIC_PATHS = [
  "/",
  "/features",
  "/preview",
  "/landing-capture",
  "/pricing",
  "/roadmap",
  "/faq",
  "/login",
  "/robots.txt",
  "/sitemap.xml",
  "/changelog",
  "/blog",
  "/trading-guides",
  "/risk-calculator",
  "/privacy",
  "/terms",
] as const;

export function isPublicPath(pathname: string) {
  return (
    PUBLIC_PATHS.some((path) =>
      path === "/"
        ? pathname === "/"
        : pathname === path || pathname.startsWith(`${path}/`)
    ) ||
    pathname.startsWith("/share/") ||
    pathname.startsWith("/api/trade-card/") ||
    pathname.startsWith("/api/market-indices") ||
    pathname.startsWith("/api/auth/")
  );
}
