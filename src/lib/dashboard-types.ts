export interface KpiStats {
  totalTrades: number;
  winRate: number;
  pnlYtd: number;
  avgRiskReward: string;
}

export interface EquityPoint {
  date: string;
  equity: number;
}

export interface AssetDistribution {
  name: string;
  value: number;
  fill: string;
}

export type TradeDirection = "BUY" | "SELL";
export type TradeOutcome = "Win" | "Loss";

export interface Trade {
  id: string;
  date: string;
  ticker: string;
  strategy: string;
  direction: TradeDirection;
  outcome: TradeOutcome;
  pnl: number;
  assetClass: "Stocks" | "Forex" | "Crypto" | "Options";
}
