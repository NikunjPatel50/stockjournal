import { format, subMonths } from "date-fns";
import { eodhdSymbolCandidates } from "@/lib/eodhd";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import {
  getListingMarket,
  type ListingMarketId,
} from "@/lib/equity-listing-markets";
import type { OhlcvBar } from "@/lib/trade-pulse/types";
import type { MarketDataProvider } from "@/lib/trade-pulse/providers/market-data-provider";

const EODHD_API_BASE = "https://eodhd.com/api";
const FETCH_TIMEOUT_MS = 8000;

type EodhdEodRow = {
  date?: string;
  open?: number | string;
  high?: number | string;
  low?: number | string;
  close?: number | string;
  volume?: number | string;
};

function toNumber(value: number | string | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function mapEodhdRows(rows: EodhdEodRow[]): OhlcvBar[] {
  return rows
    .map((row) => {
      const open = toNumber(row.open);
      const high = toNumber(row.high);
      const low = toNumber(row.low);
      const close = toNumber(row.close);
      const volume = toNumber(row.volume);
      const date = row.date?.trim();

      if (
        !date ||
        open == null ||
        high == null ||
        low == null ||
        close == null ||
        volume == null
      ) {
        return null;
      }

      return { date, open, high, low, close, volume };
    })
    .filter((bar): bar is OhlcvBar => bar != null)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function fetchEodhdDailyBars(
  ticker: string,
  listingMarket: ListingMarketId
): Promise<OhlcvBar[]> {
  const apiKey = process.env.EODHD_API_KEY?.trim();
  if (!apiKey) return [];

  const exchange = getListingMarket(listingMarket).eodhdExchange;
  const candidates = eodhdSymbolCandidates(ticker, "Equities", exchange);

  for (const symbol of candidates) {
    const url = new URL(`${EODHD_API_BASE}/eod/${encodeURIComponent(symbol)}`);
    url.searchParams.set("api_token", apiKey);
    url.searchParams.set("fmt", "json");
    url.searchParams.set("from", format(subMonths(new Date(), 6), "yyyy-MM-dd"));
    url.searchParams.set("to", format(new Date(), "yyyy-MM-dd"));
    url.searchParams.set("order", "a");

    const res = await fetchWithTimeout(url.toString(), { cache: "no-store" }, FETCH_TIMEOUT_MS);
    if (!res.ok) continue;

    const rows = (await res.json()) as EodhdEodRow[];
    if (!Array.isArray(rows) || rows.length === 0) continue;

    const bars = mapEodhdRows(rows);
    if (bars.length > 0) return bars;
  }

  return [];
}

export const eodhdMarketDataProvider: MarketDataProvider = {
  id: "eodhd",
  fetchDailyBars: fetchEodhdDailyBars,
};
