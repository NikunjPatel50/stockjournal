"use client";

import { useEffect, useState } from "react";

/** Tick for live hold-time display on active trades. */
export function useHoldTimeClock(intervalMs = 60_000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  return now;
}
