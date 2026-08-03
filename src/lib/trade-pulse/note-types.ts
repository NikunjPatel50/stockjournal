import { format } from "date-fns";
import type { TradePulseAnomaly } from "@/lib/trade-pulse/anomaly-types";
import type { TradePulseNewsItem } from "@/lib/trade-pulse/news-types";
import type { PositionMarketData } from "@/lib/trade-pulse/types";

export type TradePulseNoteRecord = {
  id: string;
  userId: string;
  tradeId: string;
  ticker: string;
  note: string;
  primarySignal: TradePulseAnomaly["primarySignal"];
  pulseDate: string;
  marketSnapshot: PositionMarketData;
  newsSnapshot: TradePulseNewsItem[];
  generatedAt: string;
};

export type TradePulseNoteInsert = {
  userId: string;
  tradeId: string;
  ticker: string;
  note: string;
  primarySignal: TradePulseAnomaly["primarySignal"];
  pulseDate: string;
  marketSnapshot: PositionMarketData;
  newsSnapshot: TradePulseNewsItem[];
  generatedAt: string;
};

type TradePulseNoteRow = {
  id: string;
  user_id: string;
  trade_id: string;
  ticker: string;
  note: string;
  primary_signal: TradePulseAnomaly["primarySignal"];
  pulse_date: string;
  market_snapshot: PositionMarketData;
  news_snapshot: TradePulseNewsItem[];
  generated_at: string;
};

export function pulseDateKey(asOf: Date = new Date()): string {
  return format(asOf, "yyyy-MM-dd");
}

export function mapTradePulseNoteRow(row: TradePulseNoteRow): TradePulseNoteRecord {
  return {
    id: row.id,
    userId: row.user_id,
    tradeId: row.trade_id,
    ticker: row.ticker,
    note: row.note,
    primarySignal: row.primary_signal,
    pulseDate: row.pulse_date,
    marketSnapshot: row.market_snapshot,
    newsSnapshot: row.news_snapshot ?? [],
    generatedAt: row.generated_at,
  };
}

export function toTradePulseNoteRow(input: TradePulseNoteInsert) {
  return {
    user_id: input.userId,
    trade_id: input.tradeId,
    ticker: input.ticker,
    note: input.note,
    primary_signal: input.primarySignal,
    pulse_date: input.pulseDate,
    market_snapshot: input.marketSnapshot,
    news_snapshot: input.newsSnapshot,
    generated_at: input.generatedAt,
  };
}
