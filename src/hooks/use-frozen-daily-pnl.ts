"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DailyPnlPoint } from "@/lib/analytics";
import type { ListingMarketId } from "@/lib/equity-listing-markets";
import {
  dailyPnlPointsEqual,
  mergeFrozenClosedDailyPnl,
  readFrozenDailyPnl,
  writeFrozenDailyPnl,
} from "@/lib/frozen-daily-pnl";
import {
  isExchangeSessionClosedForDate,
  todayYmdForListingMarket,
} from "@/lib/listing-market-hours";
import type { CurrencyCode } from "@/lib/settings";

/** Closed session bars stay locked; later EOD refreshes cannot rewrite them. */
export function useFrozenDailyPnl(
  daily: DailyPnlPoint[],
  currency: CurrencyCode,
  listingMarket: ListingMarketId,
  asOf: Date
): { daily: DailyPnlPoint[]; todayFrozen: boolean } {
  const todayYmd = todayYmdForListingMarket(listingMarket, asOf);
  const sessionClosed = isExchangeSessionClosedForDate(
    listingMarket,
    todayYmd,
    asOf
  );
  const [frozen, setFrozen] = useState(() => readFrozenDailyPnl(currency));
  const dailyRef = useRef(daily);

  useEffect(() => {
    setFrozen(readFrozenDailyPnl(currency));
  }, [currency]);

  const merged = useMemo(
    () =>
      mergeFrozenClosedDailyPnl(daily, frozen, (date) =>
        date < todayYmd || (date === todayYmd && sessionClosed)
      ),
    [daily, frozen, sessionClosed, todayYmd]
  );

  useEffect(() => {
    if (!merged.changed) return;
    writeFrozenDailyPnl(currency, merged.nextFrozen);
    setFrozen(merged.nextFrozen);
  }, [currency, merged.changed, merged.nextFrozen]);

  if (!dailyPnlPointsEqual(dailyRef.current, merged.daily)) {
    dailyRef.current = merged.daily;
  }

  return {
    daily: dailyRef.current,
    todayFrozen: sessionClosed && Boolean(frozen[todayYmd]),
  };
}
