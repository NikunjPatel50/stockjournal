"use client";

import { useMemo } from "react";
import { RefreshCw } from "lucide-react";
import { TradePulseCard } from "@/components/trade-pulse/trade-pulse-card";
import { Button } from "@/components/ui/button";
import { useTradePulseNotes } from "@/hooks/use-trade-pulse-notes";
import { useJournalTrades } from "@/components/journal-trades-provider";

export function TradePulseSection() {
  const { trades } = useJournalTrades();
  const activeEquityCount = useMemo(
    () =>
      trades.filter(
        (trade) =>
          (trade.status ?? "Closed") === "Active" &&
          trade.assetClass === "Equities" &&
          trade.ticker.trim()
      ).length,
    [trades]
  );

  const { notes, loading, generating, error, setupRequired, generateNotes } =
    useTradePulseNotes({ autoGenerate: false });

  if (activeEquityCount === 0) {
    return null;
  }

  return (
    <section aria-label="Trade Pulse">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Trade Pulse
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Daily notes on notable moves and news for open positions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {notes.length > 0 ? (
            <span className="shrink-0 rounded-md border border-border/70 bg-muted/40 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
              {notes.length} {notes.length === 1 ? "update" : "updates"}
            </span>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => void generateNotes()}
            disabled={generating || loading}
          >
            <RefreshCw
              className={generating ? "size-3.5 animate-spin" : "size-3.5"}
            />
            {generating ? "Checking…" : "Refresh"}
          </Button>
        </div>
      </div>

      {loading || generating ? (
        <div className="rounded-xl border border-border bg-muted/40 px-4 py-6 text-sm text-muted-foreground">
          Checking your open positions for notable moves and news…
        </div>
      ) : setupRequired ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-5 text-sm text-muted-foreground">
          Trade Pulse database table is missing. Run{" "}
          <code className="text-xs">003_trade_pulse_notes.sql</code> in Supabase,
          then click Refresh.
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 px-4 py-5 text-sm text-muted-foreground">
          {error}
        </div>
      ) : notes.length === 0 ? (
        <div className="rounded-xl border border-border bg-card px-4 py-5">
          <p className="text-sm font-medium text-foreground">All quiet today</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            No volume spikes, unusual price moves, or fresh news met the
            threshold for your {activeEquityCount} open{" "}
            {activeEquityCount === 1 ? "position" : "positions"}. We check
            again on the next refresh or daily run.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {notes.map((note) => (
            <TradePulseCard key={note.id} note={note} />
          ))}
        </div>
      )}
    </section>
  );
}
