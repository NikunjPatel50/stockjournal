"use client";

import { useEffect, useRef, useState } from "react";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { CalendarClock } from "lucide-react";
import type { ListingMarketId } from "@/lib/equity-listing-markets";
import {
  earningsLookupKey,
  parseEarningsDisplayDate,
  type EarningsDateInfo,
} from "@/lib/yahoo-earnings";
import type { CurrencyCode } from "@/lib/settings";
import { cn } from "@/lib/utils";

type EarningsCheckProps = {
  ticker: string;
  listingMarket: ListingMarketId;
  entryDate: string;
  currency: CurrencyCode;
};

export function EarningsCheck({
  ticker,
  listingMarket,
  entryDate,
  currency,
}: EarningsCheckProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [earnings, setEarnings] = useState<EarningsDateInfo | null>(null);

  const normalizedTicker = ticker.trim().toUpperCase();

  useEffect(() => {
    if (!open || !normalizedTicker) return;

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(null);

      void fetch("/api/earnings-dates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currency,
          symbols: [
            {
              ticker: normalizedTicker,
              assetClass: "Equities",
              listingMarket,
            },
          ],
        }),
        signal: controller.signal,
      })
        .then(async (res) => {
          const data = (await res.json()) as {
            error?: string;
            earnings?: Record<string, EarningsDateInfo | null>;
          };
          if (!res.ok) {
            throw new Error(data.error ?? "Could not load earnings");
          }
          const key = earningsLookupKey(normalizedTicker, "Equities");
          const match = data.earnings?.[key] ?? null;
          setEarnings(match ?? null);
        })
        .catch((err) => {
          if (err instanceof Error && err.name === "AbortError") return;
          setError(
            err instanceof Error ? err.message : "Could not load earnings"
          );
          setEarnings(null);
        })
        .finally(() => setLoading(false));
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, normalizedTicker, listingMarket, currency]);

  if (!normalizedTicker) return null;

  const displayDate = earnings?.nextEarningsDate
    ? parseEarningsDisplayDate(earnings.nextEarningsDate)
    : null;

  const entryParsed = entryDate ? parseISO(entryDate) : null;
  const daysUntilEarnings =
    displayDate && entryParsed && !Number.isNaN(entryParsed.getTime())
      ? differenceInCalendarDays(displayDate, entryParsed)
      : null;

  return (
    <div>
      <button
        type="button"
        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-sky-500/30 bg-sky-500/5 px-2.5 text-xs font-medium text-sky-800 hover:bg-sky-500/10 dark:text-sky-300"
        onClick={() => setOpen((v) => !v)}
      >
        <CalendarClock className="size-3.5" />
        Earnings check
      </button>

      {open ? (
        <div className="mt-2 rounded-lg border border-sky-500/20 bg-sky-500/[0.04] p-3 text-xs">
          {loading ? (
            <p className="text-muted-foreground">Looking up next earnings…</p>
          ) : error ? (
            <p className="text-rose-600 dark:text-rose-400">{error}</p>
          ) : !displayDate ? (
            <p className="text-muted-foreground">
              No upcoming earnings date found for {normalizedTicker}.
            </p>
          ) : (
            <div className="space-y-1">
              <p className="font-medium text-foreground">
                Next earnings: {format(displayDate, "MMM d, yyyy")}
                {earnings?.isEstimate ? (
                  <span className="ml-1.5 font-normal text-muted-foreground">
                    (estimated)
                  </span>
                ) : null}
              </p>
              {daysUntilEarnings != null ? (
                <p
                  className={cn(
                    "text-muted-foreground",
                    daysUntilEarnings >= 0 &&
                      daysUntilEarnings <= 7 &&
                      "text-amber-700 dark:text-amber-400",
                    daysUntilEarnings < 0 && "text-muted-foreground"
                  )}
                >
                  {daysUntilEarnings < 0
                    ? `${Math.abs(daysUntilEarnings)} days before your entry date (already reported).`
                    : daysUntilEarnings === 0
                      ? "Earnings on your entry date — gap risk is elevated."
                      : `${daysUntilEarnings} day${daysUntilEarnings === 1 ? "" : "s"} after your entry date.`}
                </p>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
