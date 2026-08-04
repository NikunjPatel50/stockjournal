"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { JournalHeader } from "@/components/journal/journal-header";
import { JournalSummaryBar } from "@/components/journal/journal-summary-bar";
import { JournalTable } from "@/components/journal/journal-table";
import { useSettings } from "@/components/settings/settings-provider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useMarketQuotes } from "@/hooks/use-market-quotes";
import {
  computeJournalSummary,
  emptyFilters,
  filterJournalTrades,
  type JournalFilters,
  type JournalTrade,
} from "@/lib/journal-types";
import {
  computeTodayDailyPnlFromQuotes,
  toActivePositionPnlInput,
} from "@/lib/active-position-daily-pnl";
import { computeFilteredPnl } from "@/lib/trade-pnl";
import { computeAccountEquity } from "@/lib/overnight-risk";
import { useJournalTrades } from "@/lib/trades-storage";
import { APP_PAGE_SHELL_CLASS } from "@/lib/app-shell";

const AddTradeModal = dynamic(
  () =>
    import("@/components/journal/add-trade-modal").then((mod) => ({
      default: mod.AddTradeModal,
    })),
  { ssr: false }
);

function tradesToCsv(trades: JournalTrade[]) {
  const headers = [
    "id",
    "ticker",
    "assetClass",
    "direction",
    "outcome",
    "status",
    "strategy",
    "entryDate",
    "exitDate",
    "entryPrice",
    "exitPrice",
    "quantity",
    "fees",
    "pnl",
    "roi",
    "tags",
    "notes",
  ];
  const rows = trades.map((t) =>
    [
      t.id,
      t.ticker,
      t.assetClass,
      t.direction,
      t.outcome,
      t.status ?? "Closed",
      t.strategy,
      t.entryDate,
      t.exitDate,
      t.entryPrice,
      t.exitPrice,
      t.quantity,
      t.fees,
      t.pnl,
      t.roi,
      t.tags.join("|"),
      `"${t.notes.replace(/"/g, '""')}"`,
    ].join(",")
  );
  return [headers.join(","), ...rows].join("\n");
}

export default function JournalPage() {
  const { trades, setTrades } = useJournalTrades();
  const { settings } = useSettings();
  const [filters, setFilters] = useState<JournalFilters>(emptyFilters);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<JournalTrade | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string[] | null>(null);

  function openEditTrade(trade: JournalTrade) {
    setEditingTrade(trade);
    setModalOpen(true);
  }

  const filtered = useMemo(
    () => filterJournalTrades(trades, filters),
    [trades, filters]
  );
  const activeTrades = useMemo(
    () => filtered.filter((t) => (t.status ?? "Closed") === "Active"),
    [filtered]
  );
  const closedTrades = useMemo(
    () => filtered.filter((t) => (t.status ?? "Closed") === "Closed"),
    [filtered]
  );
  const activePoolCount = useMemo(
    () => trades.filter((t) => (t.status ?? "Closed") === "Active").length,
    [trades]
  );
  const closedPoolCount = useMemo(
    () => trades.filter((t) => (t.status ?? "Closed") === "Closed").length,
    [trades]
  );
  const summary = useMemo(() => computeJournalSummary(filtered), [filtered]);

  const { getQuote, loading: quotesLoading, fetchedAt } = useMarketQuotes();
  const livePnl = useMemo(() => {
    const inputs = activeTrades
      .map(toActivePositionPnlInput)
      .filter((trade): trade is NonNullable<typeof trade> => trade != null);

    const quotesByTradeId: Record<
      string,
      { price: number; changePercent?: number | null }
    > = {};
    for (const trade of activeTrades) {
      const quote = getQuote(trade);
      if (quote?.price != null && quote.price > 0) {
        quotesByTradeId[trade.id] = {
          price: quote.price,
          changePercent: quote.changePercent,
        };
      }
    }

    return computeTodayDailyPnlFromQuotes(
      inputs,
      quotesByTradeId,
      settings.profile.currency
    );
  }, [activeTrades, fetchedAt, getQuote, quotesLoading, settings.profile.currency]);
  const filteredPnl = useMemo(
    () =>
      computeFilteredPnl(filtered, getQuote, settings.profile.currency),
    [filtered, getQuote, settings.profile.currency]
  );

  const accountEquity = useMemo(
    () => computeAccountEquity(trades, settings.profile.startingBalance),
    [trades, settings.profile.startingBalance]
  );

  function handleSave(trade: JournalTrade) {
    setTrades((prev) => {
      const exists = prev.some((t) => t.id === trade.id);
      if (exists) return prev.map((t) => (t.id === trade.id ? trade : t));
      return [trade, ...prev];
    });
  }

  function handleDelete(ids: string[]) {
    setDeleteTarget(ids);
  }

  function confirmDelete() {
    if (!deleteTarget?.length) return;

    const removed = trades.filter((t) => deleteTarget.includes(t.id));
    setTrades((prev) => prev.filter((t) => !deleteTarget.includes(t.id)));
    setDeleteTarget(null);

    if (removed.length === 1) {
      toast.success(`${removed[0].ticker} removed from your journal`);
      return;
    }

    toast.success(`${removed.length} trades removed from your journal`);
  }

  const deleteDialogCopy = useMemo(() => {
    if (!deleteTarget?.length) {
      return { title: "Delete trade?", description: "" };
    }

    if (deleteTarget.length === 1) {
      const trade = trades.find((t) => t.id === deleteTarget[0]);
      const label = trade?.ticker ?? "this trade";
      return {
        title: `Delete ${label}?`,
        description:
          "This trade will be permanently removed from your journal. You can't undo this action.",
      };
    }

    return {
      title: `Delete ${deleteTarget.length} trades?`,
      description:
        "These trades will be permanently removed from your journal. You can't undo this action.",
    };
  }, [deleteTarget, trades]);

  function handleDuplicate(trade: JournalTrade) {
    const copy: JournalTrade = {
      ...trade,
      id: crypto.randomUUID(),
      ticker: `${trade.ticker}`,
      notes: `${trade.notes} (duplicate)`,
      executions: trade.executions.map((e) => ({
        ...e,
        id: crypto.randomUUID(),
      })),
    };
    setTrades((prev) => [copy, ...prev]);
  }

  function handleExportCsv() {
    const csv = tradesToCsv(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tradetracker-journal-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const lines = text.trim().split(/\r?\n/).slice(1);
      if (!lines.length) {
        alert("No rows found in CSV.");
        return;
      }
      const imported = lines.flatMap((line, index) => {
        const cols = line.split(",");
        if (cols.length < 12) return [];
        const hasStatusCol =
          cols[5] === "Active" || cols[5] === "Closed";
        const o = hasStatusCol ? 1 : 0;
        const status = (
          hasStatusCol ? cols[5] : "Closed"
        ) as JournalTrade["status"];
        const entryPrice = Number(cols[8 + o]);
        const exitPrice = Number(cols[9 + o]);
        const quantity = Number(cols[10 + o]);
        const fees = Number(cols[11 + o] ?? 0);
        const pnl = Number(cols[12 + o] ?? 0);
        const direction = (cols[3] === "Short" ? "Short" : "Long") as
          | "Long"
          | "Short";
        const trade: JournalTrade = {
          id: crypto.randomUUID(),
          ticker: (cols[1] || `IMP${index}`).toUpperCase(),
          assetClass: (["Equities", "Options", "Crypto", "Forex"].includes(
            cols[2]
          )
            ? cols[2]
            : "Equities") as JournalTrade["assetClass"],
          direction,
          status,
          outcome: Math.abs(pnl) < 1 ? "Breakeven" : pnl > 0 ? "Win" : "Loss",
          strategy: cols[5 + o] || "Breakout",
          tags: cols[14 + o]
            ? cols[14 + o].split("|").filter(Boolean)
            : ["Imported"],
          entryDate: cols[6 + o] || new Date().toISOString(),
          exitDate: cols[7 + o] || new Date().toISOString(),
          entryPrice: entryPrice || 1,
          exitPrice: exitPrice || 1,
          quantity: quantity || 1,
          fees: fees || 0,
          stopLoss: entryPrice || 1,
          profitTarget: exitPrice || 1,
          pnl,
          roi: Number(cols[13 + o] ?? 0),
          holdTimeHours: 1,
          riskReward: "1:1.0",
          plannedRisk: 0,
          realizedRisk: pnl < 0 ? Math.abs(pnl) : 0,
          mindset: 3,
          notes: cols[15 + o]?.replace(/^"|"$/g, "") || "Imported from CSV",
          psychology: [],
          executions: [],
          screenshots: [],
        };
        return [trade];
      });

      if (!imported.length) {
        alert("Could not parse CSV rows.");
        return;
      }
      setTrades((prev) => [...imported, ...prev]);
      alert(`Imported ${imported.length} trade(s).`);
    };
    reader.readAsText(file);
  }

  return (
    <div className={APP_PAGE_SHELL_CLASS}>
      <JournalHeader
        filters={filters}
        onFiltersChange={setFilters}
        onLogTrade={() => {
          setEditingTrade(null);
          setModalOpen(true);
        }}
        onExportCsv={handleExportCsv}
        onImportFile={handleImportFile}
      />

      <JournalSummaryBar
        summary={summary}
        livePnl={livePnl}
        filteredPnl={filteredPnl}
        livePnlLoading={quotesLoading}
      />

      <div className="space-y-6">
        <JournalTable
          title="Active trade log"
          trades={activeTrades}
          accountEquity={accountEquity}
          totalTradeCount={activePoolCount}
          onEdit={openEditTrade}
          onDuplicate={handleDuplicate}
          onDelete={handleDelete}
        />

        {closedPoolCount > 0 ? (
          <JournalTable
            title="Closed trades"
            trades={closedTrades}
            accountEquity={accountEquity}
            totalTradeCount={closedPoolCount}
            enableLiveQuotes={false}
            onEdit={openEditTrade}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
          />
        ) : null}
      </div>

      <AddTradeModal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) setEditingTrade(null);
        }}
        initialTrade={editingTrade}
        trades={trades}
        onSave={handleSave}
      />

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-rose-500/10 text-rose-600">
              <Trash2 />
            </AlertDialogMedia>
            <AlertDialogTitle>{deleteDialogCopy.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDialogCopy.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {deleteTarget && deleteTarget.length > 1
                ? "Keep trades"
                : "Keep trade"}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 text-white hover:bg-rose-600/90"
              onClick={confirmDelete}
            >
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
