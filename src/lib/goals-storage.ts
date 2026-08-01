"use client";

import { useCallback, useEffect, useState } from "react";
import type { Goal } from "@/lib/goals";
import {
  pushGoalsToCloud,
  setLocalGoalsSyncTime,
  syncGoalsWithCloud,
} from "@/lib/goals-cloud-sync";
import {
  getActiveStorageUserId,
  goalsStorageKey,
} from "@/lib/user-storage";
import { USER_STORAGE_BOUND_EVENT } from "@/lib/trades-storage";

export const GOALS_UPDATED_EVENT = "tradetracker-goals-updated";

function resolveGoalsKey(): string | null {
  const userId = getActiveStorageUserId();
  return userId ? goalsStorageKey(userId) : null;
}

export function loadGoals(userId?: string | null): Goal[] {
  if (typeof window === "undefined") return [];

  const id = userId ?? getActiveStorageUserId();
  if (!id) return [];

  const raw = localStorage.getItem(goalsStorageKey(id));
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as Goal[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveGoals(goals: Goal[]) {
  if (typeof window === "undefined") return;
  const key = resolveGoalsKey();
  const userId = getActiveStorageUserId();
  if (!key || !userId) return;
  localStorage.setItem(key, JSON.stringify(goals));
  setLocalGoalsSyncTime(userId, Date.now());
  void pushGoalsToCloud(userId, goals);
  queueMicrotask(() => {
    window.dispatchEvent(new Event(GOALS_UPDATED_EVENT));
  });
}

export function useGoals() {
  const [goals, setGoalsState] = useState<Goal[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [userId, setUserId] = useState<string | null>(() =>
    typeof window === "undefined" ? null : getActiveStorageUserId()
  );

  useEffect(() => {
    function syncUser() {
      setUserId(getActiveStorageUserId());
    }
    syncUser();
    window.addEventListener(USER_STORAGE_BOUND_EVENT, syncUser);
    return () => window.removeEventListener(USER_STORAGE_BOUND_EVENT, syncUser);
  }, []);

  useEffect(() => {
    if (!userId) {
      setGoalsState([]);
      setHydrated(true);
      return;
    }

    const local = loadGoals(userId);
    setGoalsState(local);
    setHydrated(true);

    let cancelled = false;
    void syncGoalsWithCloud(userId, local).then((merged) => {
      if (cancelled) return;
      if (JSON.stringify(merged) !== JSON.stringify(local)) {
        localStorage.setItem(goalsStorageKey(userId), JSON.stringify(merged));
        setLocalGoalsSyncTime(userId, Date.now());
        setGoalsState(merged);
      }
    });

    function refresh() {
      setGoalsState(loadGoals(userId));
    }

    window.addEventListener(GOALS_UPDATED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      cancelled = true;
      window.removeEventListener(GOALS_UPDATED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [userId]);

  const setGoals = useCallback(
    (updater: Goal[] | ((prev: Goal[]) => Goal[])) => {
      setGoalsState((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        queueMicrotask(() => saveGoals(next));
        return next;
      });
    },
    []
  );

  return { goals, setGoals, hydrated };
}
