"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";
import type { JournalTrade } from "@/lib/journal-types";
import { normalizeJournalTrade } from "@/lib/journal-types";
import {
  getActiveStorageUserId,
  LEGACY_TRADES_BACKUP_KEY,
  tradesStorageKey,
} from "@/lib/user-storage";
import {
  pushTradesToCloud,
  setLocalTradesSyncTime,
  syncJournalTradesWithCloud,
} from "@/lib/trades-cloud-sync";

export const TRADES_UPDATED_EVENT = "tradetracker-trades-updated";
export const USER_STORAGE_BOUND_EVENT = "tradetracker-user-storage-bound";

const CLOUD_PUSH_DEBOUNCE_MS = 1500;

const LEGACY_DEMO_SEED_KEY = "tradetracker_journal_demo_seeded_v1";

const cloudPushTimers = new Map<string, number>();
const cloudPushPending = new Map<string, JournalTrade[]>();

function scheduleCloudPush(userId: string, trades: JournalTrade[]) {
  cloudPushPending.set(userId, trades);
  const existing = cloudPushTimers.get(userId);
  if (existing != null) {
    window.clearTimeout(existing);
  }

  const timer = window.setTimeout(() => {
    cloudPushTimers.delete(userId);
    const pending = cloudPushPending.get(userId);
    cloudPushPending.delete(userId);
    if (pending) {
      void pushTradesToCloud(userId, pending);
    }
  }, CLOUD_PUSH_DEBOUNCE_MS);

  cloudPushTimers.set(userId, timer);
}

function isLegacyDemoTrade(trade: JournalTrade): boolean {
  if (trade.id.startsWith("mock-journal-")) return true;
  return (
    trade.notes?.includes("Demo trade") === true &&
    trade.notes.includes("pagination")
  );
}

function stripLegacyDemoTrades(trades: JournalTrade[]): JournalTrade[] {
  return trades.filter((t) => !isLegacyDemoTrade(t));
}

function resolveTradesKey(): string | null {
  const userId = getActiveStorageUserId();
  return userId ? tradesStorageKey(userId) : null;
}

export function loadJournalTrades(userId?: string | null): JournalTrade[] {
  if (typeof window === "undefined") return [];

  localStorage.removeItem(LEGACY_DEMO_SEED_KEY);

  const id = userId ?? getActiveStorageUserId();
  if (!id) return [];

  const key = tradesStorageKey(id);
  let raw = localStorage.getItem(key);

  if (!raw) {
    const legacy = localStorage.getItem(LEGACY_TRADES_BACKUP_KEY);
    if (legacy) {
      raw = legacy;
      localStorage.setItem(key, legacy);
      localStorage.removeItem(LEGACY_TRADES_BACKUP_KEY);
    }
  }

  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as JournalTrade[];
    const normalized = Array.isArray(parsed)
      ? parsed.map((t) => normalizeJournalTrade(t))
      : [];
    const cleaned = stripLegacyDemoTrades(normalized);
    if (cleaned.length !== normalized.length) {
      localStorage.setItem(key, JSON.stringify(cleaned));
    }
    return cleaned;
  } catch {
    return [];
  }
}

export function saveJournalTrades(trades: JournalTrade[]) {
  if (typeof window === "undefined") return;
  const key = resolveTradesKey();
  const userId = getActiveStorageUserId();
  if (!key || !userId) return;
  localStorage.setItem(key, JSON.stringify(trades));
  setLocalTradesSyncTime(userId, Date.now());
  scheduleCloudPush(userId, trades);
  queueMicrotask(() => {
    window.dispatchEvent(new Event(TRADES_UPDATED_EVENT));
  });
}

export function useJournalTradesState() {
  const [userId, setUserId] = useState<string | null>(null);
  const [trades, setTradesState] = useState<JournalTrade[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useLayoutEffect(() => {
    setUserId(getActiveStorageUserId());
  }, []);

  useEffect(() => {
    function syncUser() {
      setUserId(getActiveStorageUserId());
    }
    window.addEventListener(USER_STORAGE_BOUND_EVENT, syncUser);
    return () => window.removeEventListener(USER_STORAGE_BOUND_EVENT, syncUser);
  }, []);

  // Layout effect so the stored trades are on screen in the first painted
  // frame rather than after a placeholder flash.
  useLayoutEffect(() => {
    if (!userId) {
      setTradesState([]);
      setHydrated(true);
      return;
    }

    const local = loadJournalTrades(userId);
    setTradesState(local);
    setHydrated(true);

    let cancelled = false;
    void syncJournalTradesWithCloud(userId, local).then((merged) => {
      if (cancelled) return;
      if (JSON.stringify(merged) !== JSON.stringify(local)) {
        const key = tradesStorageKey(userId);
        localStorage.setItem(key, JSON.stringify(merged));
        setLocalTradesSyncTime(userId, Date.now());
        setTradesState(merged);
      }
    });

    const retryTimer = window.setTimeout(() => {
      if (cancelled) return;
      const again = loadJournalTrades(userId);
      if (again.length === 0) {
        void syncJournalTradesWithCloud(userId, again).then((merged) => {
          if (cancelled || merged.length === 0) return;
          const key = tradesStorageKey(userId);
          localStorage.setItem(key, JSON.stringify(merged));
          setLocalTradesSyncTime(userId, Date.now());
          setTradesState(merged);
        });
      }
    }, 2500);

    function refresh() {
      setTradesState(loadJournalTrades(userId));
    }

    window.addEventListener(TRADES_UPDATED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      cancelled = true;
      window.clearTimeout(retryTimer);
      window.removeEventListener(TRADES_UPDATED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [userId]);

  const setTrades = useCallback(
    (updater: JournalTrade[] | ((prev: JournalTrade[]) => JournalTrade[])) => {
      setTradesState((prev) => {
        const next =
          typeof updater === "function" ? updater(prev) : updater;
        queueMicrotask(() => saveJournalTrades(next));
        return next;
      });
    },
    []
  );

  return { trades, setTrades, hydrated };
}
