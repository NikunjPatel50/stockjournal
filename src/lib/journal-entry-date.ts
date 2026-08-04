import { parseISO } from "date-fns";
import type { ListingMarketId } from "@/lib/equity-listing-markets";
import { timeZoneForListingMarket } from "@/lib/listing-market-hours";
import { ymdInTimeZone } from "@/lib/us-market-calendar";

/** Parse journal entry/exit datetime strings (datetime-local or ISO). */
export function parseJournalEntryDate(entryDate: string): Date | null {
  const trimmed = entryDate.trim();
  if (!trimmed) return null;

  const dateTimeLocal = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})/.exec(trimmed);
  if (dateTimeLocal && !/(?:Z|[+-]\d{2}:?\d{2})$/i.test(trimmed)) {
    const [, y, m, d, hh, mm] = dateTimeLocal;
    return new Date(
      Number(y),
      Number(m) - 1,
      Number(d),
      Number(hh),
      Number(mm),
      0,
      0
    );
  }

  const parsed = parseISO(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function entryDayKey(
  entryDate: string,
  listingMarket: ListingMarketId
): string {
  const trimmed = entryDate.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const dateTimeLocal = /^(\d{4}-\d{2}-\d{2})[ T]\d{2}:\d{2}/.exec(trimmed);
  if (dateTimeLocal && !/(?:Z|[+-]\d{2}:?\d{2})$/i.test(trimmed)) {
    return dateTimeLocal[1];
  }

  const timeZone = timeZoneForListingMarket(listingMarket);
  const parsed = parseJournalEntryDate(trimmed) ?? parseISO(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return ymdInTimeZone(parsed, timeZone);
  }

  return trimmed.slice(0, 10);
}

/** Whether the position was opened on a given exchange session date. */
export function isEnteredOnSessionDate(
  entryDate: string,
  sessionDate: string,
  listingMarket: ListingMarketId
): boolean {
  const candidates = new Set<string>();
  candidates.add(entryDayKey(entryDate, listingMarket));

  const trimmed = entryDate.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    candidates.add(trimmed.slice(0, 10));
  }

  const parsed = parseJournalEntryDate(trimmed);
  if (parsed && !Number.isNaN(parsed.getTime())) {
    const timeZone = timeZoneForListingMarket(listingMarket);
    candidates.add(ymdInTimeZone(parsed, timeZone));
  }

  return candidates.has(sessionDate);
}
