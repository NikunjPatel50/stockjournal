import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type ScreenerSnapshotRecord<T> = {
  sessionDate: string;
  payload: T;
  updatedAt: string;
};

let snapshotStoreState: "unknown" | "up" | "down" = "unknown";

function markStoreError(message: string | undefined): boolean {
  if (message && /screener_snapshots|schema cache/i.test(message)) {
    snapshotStoreState = "down";
    return true;
  }
  return false;
}

export function isScreenerSnapshotStoreUp() {
  return snapshotStoreState !== "down";
}

export async function readScreenerSnapshot<T>(
  snapshotKey: string
): Promise<ScreenerSnapshotRecord<T> | null> {
  if (snapshotStoreState === "down") return null;

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("screener_snapshots")
      .select("session_date, payload, updated_at")
      .eq("snapshot_key", snapshotKey)
      .maybeSingle();

    if (error || !data) {
      if (error && !markStoreError(error.message)) {
        console.error("[screener/snapshot] read", snapshotKey, error.message);
      }
      return null;
    }

    snapshotStoreState = "up";
    return {
      sessionDate: String(data.session_date),
      payload: data.payload as T,
      updatedAt: String(data.updated_at),
    };
  } catch {
    return null;
  }
}

export async function writeScreenerSnapshot<T>(
  snapshotKey: string,
  sessionDate: string,
  payload: T
): Promise<boolean> {
  if (snapshotStoreState === "down") return false;

  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from("screener_snapshots").upsert(
      {
        snapshot_key: snapshotKey,
        session_date: sessionDate,
        payload,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "snapshot_key" }
    );
    if (error) {
      if (!markStoreError(error.message)) {
        console.error("[screener/snapshot] write", snapshotKey, error.message);
      }
      return false;
    }
    snapshotStoreState = "up";
    return true;
  } catch {
    return false;
  }
}
