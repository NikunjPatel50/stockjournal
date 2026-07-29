"use client";

import { useRef, useState } from "react";
import {
  AlertTriangle,
  Download,
  FileJson,
  FileSpreadsheet,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { useSettings } from "@/components/settings/settings-provider";
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
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  SETTINGS_STORAGE_KEY,
  TRADES_BACKUP_KEY,
  defaultSettings,
  type AppSettings,
} from "@/lib/settings";
import { loadJournalTrades } from "@/lib/trades-storage";
import { getActiveStorageUserId } from "@/lib/user-storage";

export function DataSettings() {
  const { settings, replaceSettings, resetSettings } = useSettings();
  const fileRef = useRef<HTMLInputElement>(null);
  const [clearOpen, setClearOpen] = useState(false);

  function exportTradesCsv() {
    const userId = getActiveStorageUserId();
    const trades = userId ? loadJournalTrades(userId) : [];

    const headers = [
      "id",
      "ticker",
      "assetClass",
      "direction",
      "outcome",
      "strategy",
      "entryDate",
      "exitDate",
      "entryPrice",
      "exitPrice",
      "quantity",
      "pnl",
      "notes",
    ];
    const rows = trades.map((t) =>
      [
        t.id,
        t.ticker,
        t.assetClass,
        t.direction,
        t.outcome,
        t.strategy,
        t.entryDate,
        t.exitDate,
        t.entryPrice,
        t.exitPrice,
        t.quantity,
        t.pnl,
        `"${(t.notes ?? "").replace(/"/g, '""')}"`,
      ].join(",")
    );
    downloadBlob(
      [headers.join(","), ...rows].join("\n"),
      `tradetracker-trades-${dateStamp()}.csv`,
      "text/csv;charset=utf-8;"
    );
    toast.success("Trades CSV exported");
  }

  function exportBackupJson() {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      settings,
      trades: getActiveStorageUserId()
        ? loadJournalTrades(getActiveStorageUserId()!)
        : [],
    };
    downloadBlob(
      JSON.stringify(payload, null, 2),
      `tradetracker-backup-${dateStamp()}.json`,
      "application/json"
    );
    toast.success("Backup JSON downloaded");
  }

  function handleImport(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result ?? "");
        if (file.name.endsWith(".json")) {
          const data = JSON.parse(text) as {
            settings?: AppSettings;
            trades?: unknown;
          };
          if (data.settings) {
            replaceSettings({
              ...defaultSettings,
              ...data.settings,
              profile: {
                ...defaultSettings.profile,
                ...data.settings.profile,
              },
              risk: { ...defaultSettings.risk, ...data.settings.risk },
              customization: {
                strategies:
                  data.settings.customization?.strategies ??
                  defaultSettings.customization.strategies,
                tags:
                  data.settings.customization?.tags ??
                  defaultSettings.customization.tags,
              },
              display: {
                ...defaultSettings.display,
                ...data.settings.display,
              },
            });
          }
          if (data.trades) {
            localStorage.setItem(
              TRADES_BACKUP_KEY,
              JSON.stringify(data.trades)
            );
          }
          toast.success("Workspace restored from JSON backup");
          return;
        }

        // CSV import: store as simple note in localStorage marker
        localStorage.setItem("tradetracker_imported_csv", text);
        toast.success("CSV uploaded (stored locally for journal import)");
      } catch {
        toast.error("Could not parse the selected file");
      }
    };
    reader.readAsText(file);
  }

  function clearAllData() {
    localStorage.removeItem(TRADES_BACKUP_KEY);
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
    localStorage.removeItem("tradetracker_imported_csv");
    resetSettings();
    setClearOpen(false);
    toast.success("Local workspace cleared");
  }

  return (
    <div className="space-y-4">
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Data Export</CardTitle>
          <CardDescription>
            Download trades and a full local workspace backup
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="gap-1.5"
            onClick={exportTradesCsv}
          >
            <FileSpreadsheet className="size-4" />
            Export All Trades (CSV)
          </Button>
          <Button
            type="button"
            className="gap-1.5 bg-indigo-600 hover:bg-indigo-600/90"
            onClick={exportBackupJson}
          >
            <FileJson className="size-4" />
            Download Backup JSON
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Data Import</CardTitle>
          <CardDescription>
            Restore application state from JSON backup or upload a CSV
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-background/40 px-4 py-10 text-center"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file) handleImport(file);
            }}
          >
            <Upload className="size-8 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Drop JSON or CSV file here</p>
              <p className="text-xs text-muted-foreground">
                Or choose a file from your device
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="gap-1.5"
              onClick={() => fileRef.current?.click()}
            >
              <Download className="size-4" />
              Choose File
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".json,.csv,application/json,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImport(file);
                e.target.value = "";
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-rose-500/30 bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-rose-500">
            <AlertTriangle className="size-4" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible actions that wipe local SwingTradingLog data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Separator />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">Clear All Local Trade Data</p>
              <p className="text-xs text-muted-foreground">
                Removes trades, settings cache, and imported files from this
                browser
              </p>
            </div>
            <Button
              type="button"
              variant="destructive"
              onClick={() => setClearOpen(true)}
            >
              Reset Workspace
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all local data?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes trades and settings stored in this
              browser. Export a backup first if you may need it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 text-white hover:bg-rose-600/90"
              onClick={clearAllData}
            >
              Yes, clear everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function dateStamp() {
  return new Date().toISOString().slice(0, 10);
}

function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
