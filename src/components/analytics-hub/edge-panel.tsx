"use client";

import { useMemo } from "react";
import { Flame, Snowflake, Trophy } from "lucide-react";
import { HubPanel } from "@/components/analytics-hub/hub-panel";
import {
  computePnlBreakdown,
  formatMoney,
  type PnlBreakdownStats,
} from "@/lib/analytics";
import type { CurrencyCode } from "@/lib/settings";
import type { JournalTrade } from "@/lib/journal-types";
import { cn, NUMERIC_CLASS } from "@/lib/utils";

type EdgePanelProps = {
  trades: JournalTrade[];
  currency: CurrencyCode;
};

function AsymmetryBar({ stats }: { stats: PnlBreakdownStats }) {
  const maxSide = Math.max(stats.avgWin, Math.abs(stats.avgLoss), 1);
  const winWidth = (stats.avgWin / maxSide) * 100;
  const lossWidth = (Math.abs(stats.avgLoss) / maxSide) * 100;

  return (
    <div className="space-y-3">
      <div>
        <div className="mb-1 flex justify-between text-xs">
          <span className="text-emerald-600 dark:text-emerald-400">Avg win</span>
          <span className={cn("font-medium", NUMERIC_CLASS)}>
            {formatMoney(stats.avgWin, false)}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted/60">
          <div
            className="h-full rounded-full bg-emerald-500"
            style={{ width: `${winWidth}%` }}
          />
        </div>
      </div>
      <div>
        <div className="mb-1 flex justify-between text-xs">
          <span className="text-rose-600 dark:text-rose-400">Avg loss</span>
          <span className={cn("font-medium", NUMERIC_CLASS)}>
            {formatMoney(stats.avgLoss, false)}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted/60">
          <div
            className="h-full rounded-full bg-rose-500"
            style={{ width: `${lossWidth}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function StreakBadge({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone: "hot" | "cold" | "gold";
}) {
  const toneClass =
    tone === "hot"
      ? "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300"
      : tone === "cold"
        ? "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300"
        : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";

  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center gap-1 rounded-xl border px-3 py-3 text-center",
        toneClass
      )}
    >
      <Icon className="size-4" />
      <p className={cn("text-xl font-bold", NUMERIC_CLASS)}>{value}</p>
      <p className="text-[10px] font-medium uppercase tracking-wide opacity-80">
        {label}
      </p>
    </div>
  );
}

export function EdgePanel({ trades, currency }: EdgePanelProps) {
  const stats = useMemo(() => computePnlBreakdown(trades), [trades]);
  const decided = stats.winCount + stats.lossCount;

  return (
    <HubPanel
      title="Win / loss asymmetry"
      subtitle="Average winner vs loser size, streaks, and extremes"
      accent="amber"
    >
      {decided === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No wins or losses to analyze yet.
        </p>
      ) : (
        <div className="space-y-5">
          <AsymmetryBar stats={stats} />

          <div className="grid grid-cols-3 gap-2">
            <StreakBadge
              icon={Flame}
              label="Win streak"
              value={stats.maxConsecutiveWins}
              tone="hot"
            />
            <StreakBadge
              icon={Snowflake}
              label="Loss streak"
              value={stats.maxConsecutiveLosses}
              tone="cold"
            />
            <div className="flex flex-1 flex-col items-center justify-center gap-1 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-center text-amber-700 dark:text-amber-300">
              <Trophy className="size-4" />
              <p className="max-w-full truncate text-sm font-bold">
                {stats.bestTradeTicker}
              </p>
              <p className="text-[10px] font-medium uppercase tracking-wide opacity-80">
                Best ticker
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-xl border border-border/60 bg-muted/15 p-3 text-xs">
            <div>
              <p className="text-muted-foreground">Largest win</p>
              <p
                className={cn(
                  "mt-0.5 font-semibold text-emerald-600 dark:text-emerald-400",
                  NUMERIC_CLASS
                )}
              >
                {formatMoney(stats.largestWin, true, currency)}
              </p>
              <p className="mt-2 text-muted-foreground">Best trade</p>
              <p className="mt-0.5 font-medium">{stats.bestTradeTicker}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Largest loss</p>
              <p
                className={cn(
                  "mt-0.5 font-semibold text-rose-600 dark:text-rose-400",
                  NUMERIC_CLASS
                )}
              >
                {formatMoney(stats.largestLoss, true, currency)}
              </p>
              <p className="mt-2 text-muted-foreground">Worst trade</p>
              <p className="mt-0.5 font-medium">{stats.worstTradeTicker}</p>
            </div>
          </div>
        </div>
      )}
    </HubPanel>
  );
}
