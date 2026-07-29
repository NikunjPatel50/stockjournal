"use client";

import {
  fetchCloudJournalTrades,
  saveCloudJournalTrades,
} from "@/app/actions/journal-trades-sync";
import type { JournalTrade } from "@/lib/journal-types";

const LOCAL_SYNC_META_PREFIX = "swingtradinglog_trades_sync_v1_";

export function getLocalTradesSyncTime(userId: string): number {
  if (typeof window === "undefined") return 0;
  const raw = localStorage.getItem(`${LOCAL_SYNC_META_PREFIX}${userId}`);
  if (!raw) return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

export function setLocalTradesSyncTime(userId: string, ms: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${LOCAL_SYNC_META_PREFIX}${userId}`, String(ms));
}

function effectiveLocalSyncTime(
  localTrades: JournalTrade[],
  localTime: number
): number {
  if (localTrades.length === 0) return localTime;
  if (localTime > 0) return localTime;
  return Date.now();
}

function mergeTradesByRecency(
  local: JournalTrade[],
  localTime: number,
  remote: JournalTrade[],
  remoteTime: number
): JournalTrade[] {
  if (local.length === 0 && remote.length > 0) {
    return remoteTime >= localTime ? remote : local;
  }
  if (remote.length === 0 && local.length > 0) {
    return localTime >= remoteTime ? local : remote;
  }

  const [older, newer] =
    localTime <= remoteTime ? [local, remote] : [remote, local];

  const map = new Map<string, JournalTrade>();
  for (const t of older) map.set(t.id, t);
  for (const t of newer) map.set(t.id, t);

  return Array.from(map.values());
}

export async function pullTradesFromCloud(): Promise<{
  trades: JournalTrade[];
  updatedAtMs: number;
} | null> {
  const result = await fetchCloudJournalTrades();
  if (!result.ok) {
    console.warn("[trades-cloud-sync] pull failed", result.error);
    return null;
  }
  return { trades: result.trades, updatedAtMs: result.updatedAtMs };
}

export async function pushTradesToCloud(
  userId: string,
  trades: JournalTrade[]
): Promise<boolean> {
  const result = await saveCloudJournalTrades(trades);
  if (!result.ok) {
    console.warn("[trades-cloud-sync] push failed", result.error);
    return false;
  }
  setLocalTradesSyncTime(userId, Date.now());
  return true;
}

export async function syncJournalTradesWithCloud(
  userId: string,
  localTrades: JournalTrade[]
): Promise<JournalTrade[]> {
  const localTime = getLocalTradesSyncTime(userId);
  const localEffective = effectiveLocalSyncTime(localTrades, localTime);
  const cloud = await pullTradesFromCloud();

  if (!cloud) return localTrades;

  const merged = mergeTradesByRecency(
    localTrades,
    localEffective,
    cloud.trades,
    cloud.updatedAtMs || 0
  );

  const mergedJson = JSON.stringify(merged);
  const localJson = JSON.stringify(localTrades);

  if (mergedJson !== localJson) {
    setLocalTradesSyncTime(
      userId,
      Math.max(localEffective, cloud.updatedAtMs, Date.now())
    );
  }

  const shouldPush =
    merged.length > 0 &&
    (mergedJson !== localJson ||
      cloud.trades.length === 0 ||
      cloud.updatedAtMs === 0);

  if (shouldPush) {
    await pushTradesToCloud(userId, merged);
  }

  return merged;
}
