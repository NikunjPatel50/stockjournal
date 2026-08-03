import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import {
  mapTradePulseNoteRow,
  pulseDateKey,
  type TradePulseNoteRecord,
} from "@/lib/trade-pulse/note-types";

export async function fetchCurrentUserTradePulseNotes(
  asOf: Date = new Date()
): Promise<TradePulseNoteRecord[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("trade_pulse_notes")
    .select("*")
    .eq("pulse_date", pulseDateKey(asOf))
    .order("generated_at", { ascending: false });

  if (error) {
    console.error("[trade-pulse] user fetch failed", error.message);
    throw new Error(error.message);
  }

  if (!data) return [];

  return data.map((row) =>
    mapTradePulseNoteRow(row as Parameters<typeof mapTradePulseNoteRow>[0])
  );
}
