"use client";

import { useEffect, useState } from "react";

export const APP_MAIN_ELEMENT_ID = "app-scroll-main";

/** Minimum main-column width before the journal desktop table fits (72rem + padding). */
export const JOURNAL_DESKTOP_TABLE_MIN_WIDTH = 1200;

/** Tracks the scrollable main column width (sidebar excluded), including browser zoom. */
export function useAppMainWidth(): number | null {
  const [width, setWidth] = useState<number | null>(null);

  useEffect(() => {
    const el = document.getElementById(APP_MAIN_ELEMENT_ID);
    if (!el) return;

    const update = () => {
      setWidth(el.getBoundingClientRect().width);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  return width;
}

export function useIsAppMainBelow(widthPx: number): boolean {
  const width = useAppMainWidth();
  // Match SSR/hydration: stay in the narrow layout until the main column is measured.
  if (width === null) return true;
  return width < widthPx;
}
