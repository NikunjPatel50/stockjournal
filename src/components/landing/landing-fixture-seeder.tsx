"use client";

import { useLayoutEffect, type ReactNode } from "react";
import {
  defaultSettings,
  saveSettings,
  type AppSettings,
} from "@/lib/settings";
import { LANDING_FIXTURE_TRADES, LANDING_PREVIEW_USER_ID } from "@/lib/landing-fixture-trades";
import {
  TRADES_UPDATED_EVENT,
  USER_STORAGE_BOUND_EVENT,
} from "@/lib/trades-storage";
import {
  journalMarketStorageKey,
  setActiveStorageUserId,
  settingsStorageKey,
  tradesStorageKey,
} from "@/lib/user-storage";

const PREVIEW_SETTINGS: AppSettings = {
  ...defaultSettings,
  profile: {
    fullName: "Demo User",
    handle: "demo",
    initials: "DU",
    currency: "INR",
    startingBalance: 100000,
  },
};

export function LandingFixtureSeeder({ children }: { children: ReactNode }) {
  useLayoutEffect(() => {
    setActiveStorageUserId(LANDING_PREVIEW_USER_ID);
    localStorage.setItem(
      tradesStorageKey(LANDING_PREVIEW_USER_ID),
      JSON.stringify(LANDING_FIXTURE_TRADES)
    );
    saveSettings(PREVIEW_SETTINGS, LANDING_PREVIEW_USER_ID);
    localStorage.setItem(
      journalMarketStorageKey(LANDING_PREVIEW_USER_ID),
      "IN"
    );
    window.dispatchEvent(new Event(USER_STORAGE_BOUND_EVENT));
    window.dispatchEvent(new Event(TRADES_UPDATED_EVENT));
  }, []);

  return children;
}
