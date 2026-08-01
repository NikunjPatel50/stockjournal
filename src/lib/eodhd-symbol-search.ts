import type { ListingMarketId } from "@/lib/equity-listing-markets";
import { eodhdSearchExchangeParam } from "@/lib/equity-listing-markets";

const EODHD_API_BASE = "https://eodhd.com/api";

export type EodhdSymbolSearchHit = {
  code: string;
  name: string;
  exchange: string;
  type: string;
  currency: string | null;
};

type EodhdSearchRow = {
  Code?: string;
  Name?: string;
  Exchange?: string;
  Type?: string;
  Currency?: string;
};

export async function searchEodhdSymbols(
  query: string,
  apiKey: string,
  options?: { limit?: number; listingMarket?: ListingMarketId }
): Promise<EodhdSymbolSearchHit[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const limit = options?.limit ?? 12;
  const url = new URL(
    `${EODHD_API_BASE}/search/${encodeURIComponent(trimmed)}`
  );
  url.searchParams.set("api_token", apiKey);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("fmt", "json");

  if (options?.listingMarket) {
    const exchange = eodhdSearchExchangeParam(options.listingMarket);
    if (exchange) {
      url.searchParams.set("exchange", exchange);
    }
  }

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) return [];

  const rows = (await res.json()) as EodhdSearchRow[];
  if (!Array.isArray(rows)) return [];

  return rows
    .filter((row) => row.Code && row.Exchange)
    .map((row) => ({
      code: row.Code!.trim().toUpperCase(),
      name: (row.Name ?? row.Code!).trim(),
      exchange: row.Exchange!.trim().toUpperCase(),
      type: (row.Type ?? "").trim(),
      currency: row.Currency?.trim().toUpperCase() ?? null,
    }));
}
