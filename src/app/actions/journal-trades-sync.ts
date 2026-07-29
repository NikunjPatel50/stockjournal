"use server";

import {
  createInsForgeServerClient,
  getCurrentUser,
} from "@/lib/insforge/server";
import type { JournalTrade } from "@/lib/journal-types";
import { normalizeJournalTrade } from "@/lib/journal-types";

type CloudRow = {
  journal_trades: unknown;
  journal_trades_updated_at: string | null;
};

function parseCloudTrades(raw: unknown): JournalTrade[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((t) => normalizeJournalTrade(t as JournalTrade));
}

export async function fetchCloudJournalTrades(): Promise<
  | { ok: true; trades: JournalTrade[]; updatedAtMs: number }
  | { ok: false; error: string }
> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "Not signed in" };
  }

  const client = await createInsForgeServerClient();
  const { data, error } = await client.database
    .from("user_settings")
    .select("journal_trades, journal_trades_updated_at")
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!data) {
    return { ok: true, trades: [], updatedAtMs: 0 };
  }

  const row = data as CloudRow;
  const updatedAtMs = row.journal_trades_updated_at
    ? Date.parse(row.journal_trades_updated_at)
    : 0;

  return {
    ok: true,
    trades: parseCloudTrades(row.journal_trades),
    updatedAtMs: Number.isFinite(updatedAtMs) ? updatedAtMs : 0,
  };
}

export async function saveCloudJournalTrades(
  trades: JournalTrade[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "Not signed in" };
  }

  const client = await createInsForgeServerClient();
  const now = new Date().toISOString();
  const payload = {
    journal_trades: trades,
    journal_trades_updated_at: now,
  };

  const { data: existing, error: selectError } = await client.database
    .from("user_settings")
    .select("id")
    .maybeSingle();

  if (selectError) {
    return { ok: false, error: selectError.message };
  }

  if (existing?.id) {
    const { error } = await client.database
      .from("user_settings")
      .update(payload)
      .eq("id", existing.id as string);
    if (error) {
      return { ok: false, error: error.message };
    }
  } else {
    const { error } = await client.database.from("user_settings").insert([
      {
        user_id: user.id,
        ...payload,
      },
    ]);
    if (error) {
      return { ok: false, error: error.message };
    }
  }

  return { ok: true };
}
