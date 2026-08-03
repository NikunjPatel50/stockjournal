import {
  tradePulseAnomalyThresholds,
  type TradePulseAnomaly,
  type TradePulseSignal,
} from "@/lib/trade-pulse/anomaly-types";
import type { TradePulseNewsItem } from "@/lib/trade-pulse/news-types";
import type { PositionMarketData } from "@/lib/trade-pulse/types";

function resolvePrimarySignal(input: {
  hasVolumeAnomaly: boolean;
  hasPriceAnomaly: boolean;
  hasNews: boolean;
}): TradePulseSignal {
  const marketSignals =
    Number(input.hasVolumeAnomaly) + Number(input.hasPriceAnomaly);

  if (marketSignals > 1 || (marketSignals > 0 && input.hasNews)) {
    return "mixed";
  }
  if (input.hasVolumeAnomaly) return "volume";
  if (input.hasPriceAnomaly) return "price";
  return "news";
}

/** True when today's volume or price action exceeds configured thresholds. */
export function hasMarketAnomaly(marketData: PositionMarketData): boolean {
  return (
    marketData.volumeRatio > tradePulseAnomalyThresholds.volumeRatio ||
    marketData.priceMoveAtrMultiple >
      tradePulseAnomalyThresholds.priceMoveAtrMultiple
  );
}

/**
 * Returns an anomaly descriptor when a card should be generated, otherwise null.
 *
 * A quiet day (no volume/price anomaly and no recent news) returns null so
 * Trade Pulse avoids alert fatigue.
 */
export function detectAnomaly(
  marketData: PositionMarketData,
  news: TradePulseNewsItem[] = []
): TradePulseAnomaly | null {
  const hasVolumeAnomaly =
    marketData.volumeRatio > tradePulseAnomalyThresholds.volumeRatio;
  const hasPriceAnomaly =
    marketData.priceMoveAtrMultiple >
    tradePulseAnomalyThresholds.priceMoveAtrMultiple;
  const hasNews = news.length > 0;

  if (!hasVolumeAnomaly && !hasPriceAnomaly && !hasNews) {
    return null;
  }

  return {
    hasVolumeAnomaly,
    hasPriceAnomaly,
    hasNews,
    primarySignal: resolvePrimarySignal({
      hasVolumeAnomaly,
      hasPriceAnomaly,
      hasNews,
    }),
    volumeRatio: marketData.volumeRatio,
    priceMoveAtrMultiple: marketData.priceMoveAtrMultiple,
    priceMovePct: marketData.priceMovePct,
    newsCount: news.length,
  };
}
