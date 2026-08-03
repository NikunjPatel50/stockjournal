import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  mapTradePulseNoteRow,
  pulseDateKey,
  toTradePulseNoteRow,
  type TradePulseNoteInsert,
  type TradePulseNoteRecord,
} from "@/lib/trade-pulse/note-types";

export async function upsertTradePulseNote(
  input: TradePulseNoteInsert
): Promise<TradePulseNoteRecord | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("trade_pulse_notes")
    .upsert(toTradePulseNoteRow(input), {
      onConflict: "user_id,trade_id,pulse_date",
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("[trade-pulse] upsert failed", error?.message);
    return null;
  }

  return mapTradePulseNoteRow(data as Parameters<typeof mapTradePulseNoteRow>[0]);
}

export async function fetchTradePulseNotesForUser(
  userId: string,
  pulseDate: string = pulseDateKey()
): Promise<TradePulseNoteRecord[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("trade_pulse_notes")
    .select("*")
    .eq("user_id", userId)
    .eq("pulse_date", pulseDate)
    .order("generated_at", { ascending: false });

  if (error || !data) {
    console.error("[trade-pulse] fetch failed", error?.message);
    return [];
  }

  return data.map((row) =>
    mapTradePulseNoteRow(row as Parameters<typeof mapTradePulseNoteRow>[0])
  );
}

export async function fetchTodayTradePulseNotesForUser(
  userId: string,
  asOf: Date = new Date()
): Promise<TradePulseNoteRecord[]> {
  return fetchTradePulseNotesForUser(userId, pulseDateKey(asOf));
}
