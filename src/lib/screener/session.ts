import { lastClosedTradingSessionYmd } from "@/lib/listing-market-hours";

/** Most recent NSE regular session that has already closed. */
export function getNseScreenerSessionDate(now = new Date()): string {
  return lastClosedTradingSessionYmd("IN_NSE", now) ?? "1970-01-01";
}
