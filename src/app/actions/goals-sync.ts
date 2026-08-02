"use server";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import type { Goal } from "@/lib/goals";
import { goalFromRow, goalToRow } from "@/lib/goals-mapper";

type GoalRow = Parameters<typeof goalFromRow>[0];

export async function fetchCloudGoals(): Promise<
  | { ok: true; goals: Goal[]; updatedAtMs: number }
  | { ok: false; error: string }
> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "Not signed in" };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    return { ok: false, error: error.message };
  }

  const rows = (data ?? []) as GoalRow[];
  const goals = rows.map(goalFromRow);
  const updatedAtMs = rows.reduce((max, row) => {
    const ms = row.updated_at ? Date.parse(row.updated_at) : 0;
    return Number.isFinite(ms) ? Math.max(max, ms) : max;
  }, 0);

  return { ok: true, goals, updatedAtMs };
}

export async function saveCloudGoals(
  goals: Goal[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "Not signed in" };
  }

  const supabase = await createSupabaseServerClient();

  const { data: existing, error: selectError } = await supabase
    .from("goals")
    .select("id");

  if (selectError) {
    return { ok: false, error: selectError.message };
  }

  const existingIds = new Set(
    (existing ?? []).map((row) => String((row as { id: string }).id))
  );
  const nextIds = new Set(goals.map((g) => g.id));

  const toDelete = [...existingIds].filter((id) => !nextIds.has(id));
  for (const id of toDelete) {
    const { error } = await supabase.from("goals").delete().eq("id", id);
    if (error) {
      return { ok: false, error: error.message };
    }
  }

  for (const goal of goals) {
    const row = goalToRow(goal, user.id);
    if (existingIds.has(goal.id)) {
      const { error } = await supabase
        .from("goals")
        .update(row)
        .eq("id", goal.id);
      if (error) {
        return { ok: false, error: error.message };
      }
    } else {
      const { error } = await supabase.from("goals").insert(row);
      if (error) {
        return { ok: false, error: error.message };
      }
    }
  }

  return { ok: true };
}
