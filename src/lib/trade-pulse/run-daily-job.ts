import { defaultListingMarketForCurrency } from "@/lib/equity-listing-markets";
import {
  normalizeJournalTrade,
  type JournalTrade,
} from "@/lib/journal-types";
import type { CurrencyCode } from "@/lib/settings";
import { DEFAULT_CURRENCY } from "@/lib/settings";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { detectAnomaly } from "@/lib/trade-pulse/anomaly";
import { generateTradePulseNote } from "@/lib/trade-pulse/generate-note";
import { getPositionMarketData } from "@/lib/trade-pulse/market-data";
import { getRecentNews } from "@/lib/trade-pulse/news";
import { pulseDateKey } from "@/lib/trade-pulse/note-types";
import { upsertTradePulseNote } from "@/lib/trade-pulse/storage";

type UserSettingsRow = {
  user_id: string;
  currency: CurrencyCode | null;
  journal_trades: unknown;
};

type ActivePosition = {
  userId: string;
  currency: CurrencyCode;
  trade: JournalTrade;
};

export type TradePulseJobResult = {
  pulseDate: string;
  usersScanned: number;
  positionsScanned: number;
  generated: number;
  skippedQuiet: number;
  skippedNoMarketData: number;
  failed: number;
  errors: Array<{ userId: string; tradeId: string; ticker: string; error: string }>;
};

function parseActivePositions(rows: UserSettingsRow[]): ActivePosition[] {
  const positions: ActivePosition[] = [];

  for (const row of rows) {
    if (!Array.isArray(row.journal_trades)) continue;

    const currency = row.currency ?? DEFAULT_CURRENCY;
    for (const raw of row.journal_trades) {
      const trade = normalizeJournalTrade(raw as JournalTrade, currency);
      if ((trade.status ?? "Closed") !== "Active") continue;
      if (trade.assetClass !== "Equities") continue;
      if (!trade.ticker.trim()) continue;

      positions.push({
        userId: row.user_id,
        currency,
        trade,
      });
    }
  }

  return positions;
}

async function fetchAllActivePositions(): Promise<ActivePosition[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("user_settings")
    .select("user_id, currency, journal_trades");

  if (error || !data) {
    throw new Error(error?.message ?? "Could not load user settings for Trade Pulse");
  }

  return parseActivePositions(data as UserSettingsRow[]);
}

async function fetchActivePositionsForUser(userId: string): Promise<ActivePosition[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("user_settings")
    .select("user_id, currency, journal_trades")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    throw new Error(error?.message ?? "Could not load your journal for Trade Pulse");
  }

  return parseActivePositions([data as UserSettingsRow]);
}

function createEmptyJobResult(
  pulseDate: string,
  usersScanned: number,
  positionsScanned: number
): TradePulseJobResult {
  return {
    pulseDate,
    usersScanned,
    positionsScanned,
    generated: 0,
    skippedQuiet: 0,
    skippedNoMarketData: 0,
    failed: 0,
    errors: [],
  };
}

async function runPositions(
  positions: ActivePosition[],
  asOf: Date
): Promise<TradePulseJobResult> {
  const userIds = new Set(positions.map((position) => position.userId));
  const result = createEmptyJobResult(
    pulseDateKey(asOf),
    userIds.size,
    positions.length
  );

  for (const position of positions) {
    try {
      const outcome = await processPosition(position, asOf);
      switch (outcome.status) {
        case "generated":
          result.generated += 1;
          break;
        case "skipped_quiet":
          result.skippedQuiet += 1;
          break;
        case "skipped_no_market":
          result.skippedNoMarketData += 1;
          break;
        case "failed":
          result.failed += 1;
          result.errors.push({
            userId: position.userId,
            tradeId: position.trade.id,
            ticker: position.trade.ticker,
            error: outcome.error,
          });
          break;
      }
    } catch (error) {
      result.failed += 1;
      result.errors.push({
        userId: position.userId,
        tradeId: position.trade.id,
        ticker: position.trade.ticker,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return result;
}

export async function runTradePulseForUser(
  userId: string,
  options: { asOf?: Date } = {}
): Promise<TradePulseJobResult> {
  const asOf = options.asOf ?? new Date();
  const positions = await fetchActivePositionsForUser(userId);
  return runPositions(positions, asOf);
}

async function processPosition(
  position: ActivePosition,
  asOf: Date
): Promise<
  | { status: "generated" }
  | { status: "skipped_quiet" }
  | { status: "skipped_no_market" }
  | { status: "failed"; error: string }
> {
  const { trade, userId, currency } = position;
  const listingMarket =
    trade.listingMarket ?? defaultListingMarketForCurrency(currency);

  const marketData = await getPositionMarketData(trade.ticker, trade.entryDate, {
    listingMarket,
    asOf,
  });
  if (!marketData) {
    return { status: "skipped_no_market" };
  }

  const news = await getRecentNews(trade.ticker, 48, {
    listingMarket,
  });
  const anomaly = detectAnomaly(marketData, news);
  if (!anomaly) {
    return { status: "skipped_quiet" };
  }

  const note = await generateTradePulseNote(
    {
      ticker: trade.ticker,
      direction: trade.direction,
      entryDate: trade.entryDate,
      entryPrice: trade.entryPrice,
    },
    marketData,
    news,
    anomaly
  );

  const saved = await upsertTradePulseNote({
    userId,
    tradeId: trade.id,
    ticker: trade.ticker,
    note,
    primarySignal: anomaly.primarySignal,
    pulseDate: pulseDateKey(asOf),
    marketSnapshot: marketData,
    newsSnapshot: news,
    generatedAt: asOf.toISOString(),
  });

  if (!saved) {
    return { status: "failed", error: "Could not save Trade Pulse note" };
  }

  return { status: "generated" };
}

export async function runTradePulseDailyJob(
  options: { asOf?: Date } = {}
): Promise<TradePulseJobResult> {
  const asOf = options.asOf ?? new Date();
  const positions = await fetchAllActivePositions();
  return runPositions(positions, asOf);
}
