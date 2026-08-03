import { tradePulseAnomalyThresholds } from "@/lib/trade-pulse/anomaly-types";

export type TradePulseMarketDataProvider = "yahoo" | "eodhd";

function readMarketDataProvider(): TradePulseMarketDataProvider {
  const raw = process.env.TRADE_PULSE_MARKET_DATA_PROVIDER?.trim().toLowerCase();
  if (raw === "eodhd") return "eodhd";
  return "yahoo";
}

function readOpenRouterModel(): string {
  return (
    process.env.TRADE_PULSE_OPENROUTER_MODEL?.trim() ||
    "openai/gpt-4o-mini"
  );
}

function readOpenRouterApiKey(): string | null {
  const primary = process.env.OPENROUTER_API_KEY?.trim();
  if (primary) return primary;

  const fallback = process.env.OPENAI_API_KEY?.trim();
  if (fallback?.startsWith("sk-or-")) return fallback;

  return null;
}

export const tradePulseConfig = {
  /** Swap market data source without code changes. Default: yahoo */
  marketDataProvider: readMarketDataProvider(),
  /** News: Yahoo RSS first, Google News RSS fallback */
  newsProviders: ["yahoo", "google"] as const,
  anomalyThresholds: tradePulseAnomalyThresholds,
  /** OpenRouter model slug — swap via TRADE_PULSE_OPENROUTER_MODEL */
  openRouterModel: readOpenRouterModel(),
  openRouterBaseUrl:
    process.env.OPENROUTER_BASE_URL?.trim() || "https://openrouter.ai/api/v1",
  readOpenRouterApiKey,
} as const;
