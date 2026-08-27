"use client";

import { useEffect, useState } from "react";
import {
  JOURNAL_DESKTOP_TABLE_MIN_WIDTH,
  useAppMainWidth,
} from "@/hooks/use-app-main-width";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);

  return matches;
}

export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 767px)");
}

/** Matches Tailwind `lg` — sidebar visible, journal desktop table. */
export function useIsCompactApp(): boolean {
  return useMediaQuery("(max-width: 1023px)");
}

/** Journal card layout when the main column cannot fit the full desktop table. */
export function useIsJournalCompact(): boolean {
  const mainWidth = useAppMainWidth();
  // Match SSR/hydration: card layout until the main column is measured.
  if (mainWidth === null) return true;
  return mainWidth < JOURNAL_DESKTOP_TABLE_MIN_WIDTH;
}
