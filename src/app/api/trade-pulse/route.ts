import { NextResponse } from "next/server";
import { fetchCurrentUserTradePulseNotes } from "@/lib/trade-pulse/fetch-notes";
import type { TradePulseSignal } from "@/lib/trade-pulse/anomaly-types";

export type TradePulseNoteDto = {
  id: string;
  tradeId: string;
  ticker: string;
  note: string;
  primarySignal: TradePulseSignal;
  generatedAt: string;
  pulseDate: string;
};

function isMissingTableError(message: string | undefined) {
  if (!message) return false;
  return (
    message.includes("trade_pulse_notes") &&
    (message.includes("does not exist") || message.includes("Could not find"))
  );
}

export async function GET() {
  try {
    const notes = await fetchCurrentUserTradePulseNotes();
    const payload: TradePulseNoteDto[] = notes.map((note) => ({
      id: note.id,
      tradeId: note.tradeId,
      ticker: note.ticker,
      note: note.note,
      primarySignal: note.primarySignal,
      generatedAt: note.generatedAt,
      pulseDate: note.pulseDate,
    }));

    return NextResponse.json({
      notes: payload,
      fetchedAt: Date.now(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not load Trade Pulse notes";

    if (isMissingTableError(message)) {
      return NextResponse.json(
        {
          error:
            "Trade Pulse is not set up yet. Run the trade_pulse_notes migration in Supabase.",
          code: "missing_table",
          notes: [],
        },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: message, notes: [] }, { status: 500 });
  }
}
