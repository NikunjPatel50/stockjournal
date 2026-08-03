export const tradePulseAnomalyThresholds = {
  volumeRatio: 2,
  priceMoveAtrMultiple: 1.5,
} as const;

export type TradePulseSignal = "volume" | "price" | "news" | "mixed";

export type TradePulseAnomaly = {
  hasVolumeAnomaly: boolean;
  hasPriceAnomaly: boolean;
  hasNews: boolean;
  primarySignal: TradePulseSignal;
  volumeRatio: number;
  priceMoveAtrMultiple: number;
  priceMovePct: number;
  newsCount: number;
};
