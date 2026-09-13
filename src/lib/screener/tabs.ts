export type ScreenerTab = "sectors" | "ema" | "turtle";

export function parseScreenerTab(
  value?: string | string[] | null
): ScreenerTab {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "ema" || raw === "turtle") return raw;
  return "sectors";
}

export function screenerTabHref(tab: ScreenerTab) {
  return tab === "sectors" ? "/screener" : `/screener?tab=${tab}`;
}
