"use client";

import { useEffect, useMemo, useState } from "react";
import type { DailyPnlPoint } from "@/lib/analytics";
import type { ListingMarketId } from "@/lib/equity-listing-markets";
import {
  mergeFrozenClosedDailyPnl,
  readFrozenDailyPnl,
  writeFrozenDailyPnl,
} from "@/lib/frozen-daily-pnl";
import {
  isExchangeSessionClosedForDate,
  todayYmdForListingMarket,
} from "@/lib/listing-market-hours";
import type { CurrencyCode } from "@/lib/settings";

const EMPTY_DAILY: DailyPnlPoint[] = [];

/**
 * Closed session bars stay locked; later EOD refreshes cannot rewrite them.
 * `ready` must be false until `daily` belongs to `currency`. Otherwise a
 * market switch can lock the previous market's P/L under the new currency.
 */
export function useFrozenDailyPnl(
  daily: DailyPnlPoint[],
  currency: CurrencyCode,
  listingMarket: ListingMarketId,
  asOf: Date,
  ready = true
): { daily: DailyPnlPoint[]; todayFrozen: boolean } {
  const todayYmd = todayYmdForListingMarket(listingMarket, asOf);
  const sessionClosed = isExchangeSessionClosedForDate(
    listingMarket,
    todayYmd,
    asOf
  );
  const [frozenCurrency, setFrozenCurrency] = useState(currency);
  const [frozen, setFrozen] = useState(() => readFrozenDailyPnl(currency));
  const aligned = frozenCurrency === currency;

  if (!aligned) {
    setFrozenCurrency(currency);
    setFrozen(readFrozenDailyPnl(currency));
  }

  const series = ready && aligned ? daily : EMPTY_DAILY;
  const merged = useMemo(
    () =>
      mergeFrozenClosedDailyPnl(series, frozen, (date) =>
        date < todayYmd || (date === todayYmd && sessionClosed)
      ),
    [series, frozen, sessionClosed, todayYmd]
  );

  if (ready && aligned && merged.changed) {
    setFrozen(merged.nextFrozen);
  }

  useEffect(() => {
    if (!ready || !aligned) return;
    writeFrozenDailyPnl(currency, frozen);
  }, [aligned, currency, frozen, ready]);

  if (!ready || !aligned) {
    return { daily: EMPTY_DAILY, todayFrozen: false };
  }

  return {
    daily: merged.daily,
    todayFrozen: sessionClosed && Boolean(frozen[todayYmd]),
  };
}
