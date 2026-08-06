"use client";

import { useEffect, useState } from "react";

const subscribers = new Set<() => void>();
let holdClockInterval: number | null = null;
let holdClockMs = 60_000;

function ensureHoldClock() {
  if (holdClockInterval != null || subscribers.size === 0) return;
  holdClockInterval = window.setInterval(() => {
    for (const notify of subscribers) notify();
  }, holdClockMs);
}

function stopHoldClockIfIdle() {
  if (subscribers.size > 0 || holdClockInterval == null) return;
  window.clearInterval(holdClockInterval);
  holdClockInterval = null;
}

/** Shared ticking clock for live hold-time display — one interval app-wide. */
export function useHoldTimeClock(intervalMs = 60_000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    holdClockMs = intervalMs;
    if (holdClockInterval != null) {
      window.clearInterval(holdClockInterval);
      holdClockInterval = null;
    }

    const notify = () => setNow(Date.now());
    subscribers.add(notify);
    ensureHoldClock();

    return () => {
      subscribers.delete(notify);
      stopHoldClockIfIdle();
    };
  }, [intervalMs]);

  return now;
}
