"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useJournalTrades } from "@/components/journal-trades-provider";
import { useSettings } from "@/components/settings/settings-provider";
import {
  collectJournalMarketRegions,
  defaultListingMarketForRegion,
  filterTradesByJournalRegion,
  getJournalMarketRegion,
  isJournalMarketRegionId,
  regionIdForCurrency,
  type JournalMarketRegion,
  type JournalMarketRegionId,
} from "@/lib/journal-market-regions";
import type { JournalTrade } from "@/lib/journal-types";
import type { CurrencyCode } from "@/lib/settings";
import {
  getActiveStorageUserId,
  journalMarketStorageKey,
} from "@/lib/user-storage";

const GUEST_JOURNAL_MARKET_KEY = "swingtradinglog_journal_market_guest_v1";

type JournalMarketContextValue = {
  activeRegionId: JournalMarketRegionId;
  activeRegion: JournalMarketRegion;
  activeCurrency: CurrencyCode;
  /** Trades scoped to the active market region. */
  regionTrades: JournalTrade[];
  availableRegions: JournalMarketRegion[];
  defaultListingMarket: ReturnType<typeof defaultListingMarketForRegion>;
  setActiveRegionId: (regionId: JournalMarketRegionId) => void;
  canSwitchRegion: boolean;
  /** False until client storage preference has been applied. */
  hydrated: boolean;
};

const JournalMarketContext = createContext<JournalMarketContextValue | null>(
  null
);

function loadStoredRegionId(): JournalMarketRegionId | null {
  if (typeof window === "undefined") return null;
  try {
    const userId = getActiveStorageUserId();
    const key = userId
      ? journalMarketStorageKey(userId)
      : GUEST_JOURNAL_MARKET_KEY;
    const raw = localStorage.getItem(key);
    return isJournalMarketRegionId(raw) ? raw : null;
  } catch {
    return null;
  }
}

function saveStoredRegionId(regionId: JournalMarketRegionId) {
  if (typeof window === "undefined") return;
  try {
    const userId = getActiveStorageUserId();
    const key = userId
      ? journalMarketStorageKey(userId)
      : GUEST_JOURNAL_MARKET_KEY;
    localStorage.setItem(key, regionId);
  } catch {
    // ignore storage failures
  }
}

export function JournalMarketProvider({ children }: { children: ReactNode }) {
  const { trades } = useJournalTrades();
  const { settings } = useSettings();
  const defaultCurrency = settings.profile.currency;

  const availableRegions = useMemo(
    () => collectJournalMarketRegions(trades, defaultCurrency),
    [trades, defaultCurrency]
  );

  const fallbackRegionId = regionIdForCurrency(defaultCurrency);

  const [activeRegionId, setActiveRegionIdState] =
    useState<JournalMarketRegionId>(fallbackRegionId);
  const [marketHydrated, setMarketHydrated] = useState(false);

  useEffect(() => {
    const stored = loadStoredRegionId();
    if (stored) {
      setActiveRegionIdState(stored);
    }
    setMarketHydrated(true);
  }, []);

  useEffect(() => {
    if (!availableRegions.some((region) => region.id === activeRegionId)) {
      setActiveRegionIdState(
        availableRegions[0]?.id ?? regionIdForCurrency(defaultCurrency)
      );
    }
  }, [activeRegionId, availableRegions, defaultCurrency]);

  const setActiveRegionId = useCallback((regionId: JournalMarketRegionId) => {
    setActiveRegionIdState(regionId);
    saveStoredRegionId(regionId);
  }, []);

  const activeRegion = useMemo(
    () => getJournalMarketRegion(activeRegionId),
    [activeRegionId]
  );

  const regionTrades = useMemo(
    () =>
      filterTradesByJournalRegion(trades, activeRegionId, defaultCurrency),
    [trades, activeRegionId, defaultCurrency]
  );

  const value = useMemo<JournalMarketContextValue>(
    () => ({
      activeRegionId,
      activeRegion,
      activeCurrency: activeRegion.currency,
      regionTrades,
      availableRegions,
      defaultListingMarket: defaultListingMarketForRegion(activeRegionId),
      setActiveRegionId,
      canSwitchRegion: availableRegions.length > 1,
      hydrated: marketHydrated,
    }),
    [
      activeRegion,
      activeRegionId,
      availableRegions,
      marketHydrated,
      regionTrades,
      setActiveRegionId,
    ]
  );

  return (
    <JournalMarketContext.Provider value={value}>
      {children}
    </JournalMarketContext.Provider>
  );
}

export function useJournalMarket() {
  const ctx = useContext(JournalMarketContext);
  if (!ctx) {
    throw new Error("useJournalMarket must be used within JournalMarketProvider");
  }
  return ctx;
}

/** Active market trades + currency for app-wide views (dashboard, analytics, journal, etc.). */
export function useRegionTrades() {
  const { regionTrades, activeCurrency, activeRegion, activeRegionId } =
    useJournalMarket();
  return {
    trades: regionTrades,
    currency: activeCurrency,
    activeRegion,
    activeRegionId,
  };
}
