export type InstrumentMode = "stocks" | "options";

type TradingRoute = {
  stocks: string;
  options: string;
};

/** Stock tabs hidden from navigation in options mode. */
export const STOCKS_ONLY_HREFS = new Set(["/screener"]);

/** Trading tabs that have a separate options page. Account pages stay shared. */
export const TRADING_ROUTES: TradingRoute[] = [
  { stocks: "/dashboard", options: "/options/dashboard" },
  { stocks: "/calendar", options: "/options/calendar" },
  { stocks: "/analytics", options: "/options/analytics" },
  { stocks: "/screener", options: "/options/dashboard" },
  { stocks: "/journal", options: "/options/journal" },
];

export function instrumentHref(href: string, mode: InstrumentMode) {
  const route = TRADING_ROUTES.find((item) => item.stocks === href);
  if (!route) return href;
  return mode === "options" ? route.options : route.stocks;
}

function matchesRoute(pathname: string, href: string) {
  if (pathname === href) return true;
  if (href.endsWith("/dashboard")) {
    return pathname === href;
  }
  return pathname.startsWith(`${href}/`);
}

export function detectInstrumentMode(pathname: string): InstrumentMode | null {
  if (pathname === "/options" || pathname.startsWith("/options/")) return "options";
  for (const route of TRADING_ROUTES) {
    if (matchesRoute(pathname, route.stocks)) return "stocks";
  }
  return null;
}

export function tabForPathname(pathname: string): TradingRoute | null {
  for (const route of TRADING_ROUTES) {
    if (matchesRoute(pathname, route.stocks) || matchesRoute(pathname, route.options)) {
      return route;
    }
  }
  return null;
}

/** Where the Stocks / Options pill should go for the page the reader is on. */
export function switchInstrumentPath(
  pathname: string,
  target: InstrumentMode,
  fallback: string
) {
  const route = tabForPathname(pathname);
  if (route) return target === "options" ? route.options : route.stocks;
  return fallback;
}
