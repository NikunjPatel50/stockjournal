"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { OptionsJournalHeader } from "@/components/options/journal/options-journal-header";
import { OptionsJournalMetrics } from "@/components/options/journal/options-journal-metrics";
import { OptionsPositionsTable } from "@/components/options/journal/options-positions-table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useJournalTrades } from "@/components/journal-trades-provider";
import { useRegionTrades } from "@/components/journal/journal-market-provider";
import { enrichSavedTradeFundamentals } from "@/lib/trade-fundamentals";
import type { JournalTrade } from "@/lib/journal-types";
import {
  computeOptionsJournalSummary,
  emptyOptionsJournalFilters,
  filterOptionsPositions,
  optionsPositionFromTrade,
  type OptionsJournalFilters,
  type OptionsPositionView,
} from "@/lib/options-journal";
import { APP_PAGE_SHELL_CLASS } from "@/lib/app-shell";

const AddTradeModal = dynamic(
  () =>
    import("@/components/journal/add-trade-modal").then((mod) => ({
      default: mod.AddTradeModal,
    })),
  { ssr: false }
);

function optionsTradesToCsv(positions: OptionsPositionView[]) {
  const headers = [
    "underlying",
    "strategy",
    "status",
    "entryDate",
    "exitDate",
    "netPremium",
    "pnl",
    "roi",
    "fees",
    "tags",
    "notes",
  ];
  const rows = positions.map((p) =>
    [
      p.underlying,
      p.strategyLabel,
      p.status,
      p.entryDate,
      p.exitDate,
      p.netPremium,
      p.pnl,
      p.roi,
      p.fees,
      p.tags.join("|"),
      `"${p.notes.replace(/"/g, '""')}"`,
    ].join(",")
  );
  return [headers.join(","), ...rows].join("\n");
}

export function OptionsJournalWorkspace() {
  const { trades: allTrades, setTrades } = useJournalTrades();
  const { trades: regionTrades, currency } = useRegionTrades();
  const [filters, setFilters] = useState<OptionsJournalFilters>(
    emptyOptionsJournalFilters()
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<JournalTrade | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const optionsPool = useMemo(
    () => regionTrades.filter((t) => t.assetClass === "Options"),
    [regionTrades]
  );

  const positions = useMemo(
    () => optionsPool.map(optionsPositionFromTrade),
    [optionsPool]
  );

  const filtered = useMemo(
    () => filterOptionsPositions(positions, filters),
    [positions, filters]
  );

  const openPositions = useMemo(
    () => filtered.filter((p) => p.status === "Open"),
    [filtered]
  );
  const closedPositions = useMemo(
    () =>
      filtered.filter(
        (p) => p.status === "Closed" || p.status === "Assigned"
      ),
    [filtered]
  );

  const summary = useMemo(
    () => computeOptionsJournalSummary(filtered),
    [filtered]
  );
  const handleSave = useCallback(
    (trade: JournalTrade) => {
      const normalized: JournalTrade = {
        ...trade,
        assetClass: "Options",
      };
      setTrades((prev) => {
        const exists = prev.some((t) => t.id === normalized.id);
        if (exists) {
          return prev.map((t) => (t.id === normalized.id ? normalized : t));
        }
        return [normalized, ...prev];
      });
      void enrichSavedTradeFundamentals(normalized, currency, setTrades);
      setEditingTrade(null);
      toast.success(
        normalized.status === "Active"
          ? `${normalized.ticker} options position logged`
          : `${normalized.ticker} options trade closed`
      );
    },
    [currency, setTrades]
  );

  const confirmDelete = useCallback(() => {
    if (!deleteId) return;
    const trade = allTrades.find((t) => t.id === deleteId);
    setTrades((prev) => prev.filter((t) => t.id !== deleteId));
    setDeleteId(null);
    toast.success(
      trade ? `${trade.ticker} removed from options journal` : "Position removed"
    );
  }, [allTrades, deleteId, setTrades]);

  const handleExport = useCallback(() => {
    const csv = optionsTradesToCsv(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `options-journal-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [filtered]);

  const openEdit = useCallback((position: OptionsPositionView) => {
    setEditingTrade(position.source);
    setModalOpen(true);
  }, []);

  return (
    <div className={APP_PAGE_SHELL_CLASS}>
      <OptionsJournalHeader
        filters={filters}
        onFiltersChange={setFilters}
        onLogTrade={() => {
          setEditingTrade(null);
          setModalOpen(true);
        }}
        onExportCsv={filtered.length ? handleExport : undefined}
      />

      <OptionsJournalMetrics
        summary={summary}
        positions={filtered}
        currency={currency}
      />

      <div className="flex min-w-0 flex-col gap-4">
        <OptionsPositionsTable
          title="Open Positions"
          subtitle="Live structures with net premium and days to expiration."
          positions={openPositions}
          currency={currency}
          onEdit={openEdit}
          onDelete={setDeleteId}
        />
        <OptionsPositionsTable
          title="Closed & Assigned"
          subtitle="Recently resolved trades—newest exits first."
          positions={closedPositions}
          currency={currency}
          collapsible
          defaultOpen={false}
          onEdit={openEdit}
          onDelete={setDeleteId}
        />
      </div>

      <AddTradeModal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) setEditingTrade(null);
        }}
        initialTrade={editingTrade}
        trades={allTrades}
        onSave={handleSave}
        defaultAssetClass="Options"
      />

      <AlertDialog
        open={deleteId != null}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete options position?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the position from your journal. Stock trades are not
              affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
