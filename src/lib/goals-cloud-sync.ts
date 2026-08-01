"use client";

import { fetchCloudGoals, saveCloudGoals } from "@/app/actions/goals-sync";
import type { Goal } from "@/lib/goals";

const LOCAL_SYNC_META_PREFIX = "swingtradinglog_goals_sync_v1_";

export function getLocalGoalsSyncTime(userId: string): number {
  if (typeof window === "undefined") return 0;
  const raw = localStorage.getItem(`${LOCAL_SYNC_META_PREFIX}${userId}`);
  if (!raw) return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

export function setLocalGoalsSyncTime(userId: string, ms: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${LOCAL_SYNC_META_PREFIX}${userId}`, String(ms));
}

function mergeGoalsByRecency(
  local: Goal[],
  localTime: number,
  remote: Goal[],
  remoteTime: number
): Goal[] {
  if (local.length === 0 && remote.length > 0) {
    return remoteTime >= localTime ? remote : local;
  }
  if (remote.length === 0 && local.length > 0) {
    return localTime >= remoteTime ? local : remote;
  }

  const [older, newer] =
    localTime <= remoteTime ? [local, remote] : [remote, local];

  const map = new Map<string, Goal>();
  for (const g of older) map.set(g.id, g);
  for (const g of newer) map.set(g.id, g);

  return Array.from(map.values());
}

export async function pullGoalsFromCloud(): Promise<{
  goals: Goal[];
  updatedAtMs: number;
} | null> {
  const result = await fetchCloudGoals();
  if (!result.ok) {
    console.warn("[goals-cloud-sync] pull failed", result.error);
    return null;
  }
  return { goals: result.goals, updatedAtMs: result.updatedAtMs };
}

export async function pushGoalsToCloud(
  userId: string,
  goals: Goal[]
): Promise<boolean> {
  const result = await saveCloudGoals(goals);
  if (!result.ok) {
    console.warn("[goals-cloud-sync] push failed", result.error);
    return false;
  }
  setLocalGoalsSyncTime(userId, Date.now());
  return true;
}

export async function syncGoalsWithCloud(
  userId: string,
  localGoals: Goal[]
): Promise<Goal[]> {
  const localTime = getLocalGoalsSyncTime(userId);
  const localEffective =
    localGoals.length > 0 && localTime === 0 ? Date.now() : localTime;
  const cloud = await pullGoalsFromCloud();

  if (!cloud) return localGoals;

  const merged = mergeGoalsByRecency(
    localGoals,
    localEffective,
    cloud.goals,
    cloud.updatedAtMs || 0
  );

  const mergedJson = JSON.stringify(merged);
  const localJson = JSON.stringify(localGoals);

  if (mergedJson !== localJson) {
    setLocalGoalsSyncTime(
      userId,
      Math.max(localEffective, cloud.updatedAtMs, Date.now())
    );
  }

  const shouldPush =
    merged.length > 0 &&
    (mergedJson !== localJson ||
      cloud.goals.length === 0 ||
      cloud.updatedAtMs === 0);

  if (shouldPush) {
    await pushGoalsToCloud(userId, merged);
  }

  return merged;
}
