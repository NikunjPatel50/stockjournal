export const SCREENER_PERIODS = [
  "1d",
  "1w",
  "1m",
  "3m",
  "6m",
  "1y",
  "3y",
] as const;

export type ScreenerPeriod = (typeof SCREENER_PERIODS)[number];

export const SCREENER_PERIOD_LABELS: Record<ScreenerPeriod, string> = {
  "1d": "1D",
  "1w": "1W",
  "1m": "1M",
  "3m": "3M",
  "6m": "6M",
  "1y": "1Y",
  "3y": "3Y",
};

export const SCREENER_PERIOD_LOOKBACK_DAYS: Record<ScreenerPeriod, number> = {
  "1d": 1,
  "1w": 7,
  "1m": 30,
  "3m": 91,
  "6m": 182,
  "1y": 365,
  "3y": 1095,
};

export type PeriodChanges = Record<ScreenerPeriod, number | null>;

export type ScreenerChartPoint = {
  date: string;
  close: number;
  high?: number;
};

export type SectorScreenerRow = {
  id: string;
  label: string;
  symbol: string;
  isBenchmark: boolean;
  lastPrice: number | null;
  changes: PeriodChanges;
};

export type SectorStockRow = {
  ticker: string;
  name: string;
  lastPrice: number | null;
  changes: PeriodChanges;
  vsSector: PeriodChanges;
  vsNifty: PeriodChanges;
};

export type StockScreenerDetail = {
  ticker: string;
  name: string;
  lastPrice: number | null;
  currency: "INR";
  sectorId: string | null;
  sectorLabel: string | null;
  changes: PeriodChanges;
  vsSector: PeriodChanges | null;
  vsNifty: PeriodChanges;
  sectorRank: Partial<Record<ScreenerPeriod, number>> | null;
  sectorCount: number | null;
  chart: ScreenerChartPoint[];
};

export function emptyPeriodChanges(): PeriodChanges {
  return {
    "1d": null,
    "1w": null,
    "1m": null,
    "3m": null,
    "6m": null,
    "1y": null,
    "3y": null,
  };
}

export function isScreenerPeriod(value: string): value is ScreenerPeriod {
  return (SCREENER_PERIODS as readonly string[]).includes(value);
}
