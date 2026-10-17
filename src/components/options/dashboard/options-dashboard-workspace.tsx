"use client";

import { useMemo, type ReactNode } from "react";
import { format, parseISO } from "date-fns";
import { AlertTriangle, CalendarClock } from "lucide-react";
import { AppPageHeader } from "@/components/app-page-header";
import { DataPanel, PanelEmpty } from "@/components/data-panel";
import { TargetStopProgressBar } from "@/components/journal/target-stop-progress-bar";
import { useRegionTrades } from "@/components/journal/journal-market-provider";
import { OptionsStrategyBadge } from "@/components/options/journal/options-strategy-badge";
import { useMarketQuotes } from "@/hooks/use-market-quotes";
import { APP_CARD_GRID_SURFACE_CLASS, APP_CARD_SURFACE_CLASS, APP_PAGE_SHELL_CLASS } from "@/lib/app-shell";
import {
  buildDeskPosition,
  concentration,
  expiryLadder,
  monthlyRealized,
  type DeskPosition,
  type RiskState,
} from "@/lib/options-desk";
import {
  computeOptionsJournalSummary,
  optionsPositionFromTrade,
} from "@/lib/options-journal";
import type { CurrencyCode } from "@/lib/settings";
import { cn, NUMERIC_CLASS, NUMERIC_DISPLAY_CLASS } from "@/lib/utils";

function money(value: number, currency: CurrencyCode, signed = false) {
  const locale = currency === "INR" ? "en-IN" : "en-US";
  const abs = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Math.abs(Math.round(value)));
  if (!signed) return value < 0 ? `−${abs}` : abs;
  if (Math.round(value) === 0) return abs;
  return `${value > 0 ? "+" : "−"}${abs}`;
}

function tone(value: number) {
  if (Math.round(value) > 0) return "text-emerald-600 dark:text-emerald-400";
  if (Math.round(value) < 0) return "text-rose-600 dark:text-rose-400";
  return "text-foreground";
}

const labelClass =
  "text-[11px] font-semibold tracking-wide text-muted-foreground";

const RISK_META: Record<RiskState, { label: string; className: string; rank: number }> = {
  stop: { label: "Stop hit", className: "bg-rose-500/15 text-rose-700 ring-rose-500/30 dark:text-rose-300", rank: 0 },
  "near-stop": { label: "Near stop", className: "bg-amber-500/15 text-amber-700 ring-amber-500/30 dark:text-amber-300", rank: 1 },
  target: { label: "Target hit", className: "bg-emerald-500/15 text-emerald-700 ring-emerald-500/30 dark:text-emerald-300", rank: 2 },
  "near-target": { label: "Near target", className: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300", rank: 3 },
  ok: { label: "In range", className: "bg-muted text-muted-foreground ring-border", rank: 4 },
  unplanned: { label: "No plan", className: "bg-muted text-muted-foreground ring-border", rank: 5 },
};

function RiskPill({ state }: { state: RiskState }) {
  const meta = RISK_META[state];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1",
        meta.className
      )}
    >
      {meta.label}
    </span>
  );
}

function KpiCell({
  label,
  value,
  sub,
  valueClassName,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="min-w-0 bg-card px-4 py-3.5">
      <p className={labelClass}>{label}</p>
      <p
        className={cn(
          "mt-1.5 truncate text-lg font-semibold tracking-tight",
          NUMERIC_DISPLAY_CLASS,
          valueClassName
        )}
      >
        {value}
      </p>
      {sub ? (
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{sub}</p>
      ) : null}
    </div>
  );
}

export function OptionsDashboardWorkspace() {
  const { trades: regionTrades, currency } = useRegionTrades();
  const { getQuote, quoteRevision } = useMarketQuotes();

  const positions = useMemo(
    () =>
      regionTrades
        .filter((t) => t.assetClass === "Options")
        .map(optionsPositionFromTrade),
    [regionTrades]
  );
  const open = useMemo(() => positions.filter((p) => p.status === "Open"), [positions]);
  const closed = useMemo(() => positions.filter((p) => p.status !== "Open"), [positions]);
  const summary = useMemo(() => computeOptionsJournalSummary(positions), [positions]);

  const desk = useMemo(() => {
    void quoteRevision;
    return open.map((position) =>
      buildDeskPosition(position, getQuote(position.source)?.price ?? null)
    );
  }, [open, getQuote, quoteRevision]);

  const ladder = useMemo(() => expiryLadder(desk), [desk]);
  const conc = useMemo(() => concentration(desk), [desk]);
  const months = useMemo(() => monthlyRealized(closed), [closed]);

  const openPnl = desk.reduce((s, r) => s + r.pnl, 0);
  const capitalAtRisk = desk.reduce((s, r) => s + r.capitalAtRisk, 0);
  const margin = desk.reduce((s, r) => s + r.margin, 0);
  const premiumIn = desk.reduce((s, r) => s + Math.max(0, r.premium), 0);
  const premiumOut = desk.reduce((s, r) => s + Math.max(0, -r.premium), 0);
  const bookPnl = openPnl + summary.realizedPnl;
  const liveCount = desk.filter((r) => r.spotSource === "live").length;

  const alerts = useMemo(
    () =>
      [...desk].sort(
        (a, b) =>
          RISK_META[a.risk].rank - RISK_META[b.risk].rank ||
          (b.progress?.stopPct ?? 0) - (a.progress?.stopPct ?? 0)
      ),
    [desk]
  );
  const flagged = alerts.filter((r) => RISK_META[r.risk].rank <= 3).length;
  const expiringSoon = desk.filter((r) => (r.position.dte ?? 99) <= 7).length;

  const header = (
    <AppPageHeader
      eyebrow="Options Desk"
      title="Dashboard"
      description="Risk, expiry exposure and booked P&L on your options book."
    />
  );

  if (positions.length === 0) {
    return (
      <div className={APP_PAGE_SHELL_CLASS}>
        {header}
        <PanelEmpty
          title="No options positions yet"
          hint="Log a spread or single-leg trade in the options journal. Greeks, expiry exposure and risk will show up here."
          className="min-h-[16rem]"
        />
      </div>
    );
  }

  const maxBucketRisk = Math.max(1, ...ladder.map((b) => b.capitalAtRisk));
  const maxMonth = Math.max(1, ...months.map((m) => Math.abs(m.pnl)));
  const credits = open.filter((p) => p.direction === "Short").length;
  const debits = open.length - credits;

  return (
    <div className={APP_PAGE_SHELL_CLASS}>
      {header}

      <section className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,2fr)]">
        <div className={cn(APP_CARD_SURFACE_CLASS, "relative flex flex-col justify-between p-5")}>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_0%_0%,color-mix(in_oklab,var(--primary)_14%,transparent),transparent_60%)]" />
          <div className="relative">
            <div className="flex items-center justify-between gap-2">
              <p className={labelClass}>Book P&amp;L</p>
              <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    liveCount ? "animate-pulse bg-emerald-500" : "bg-muted-foreground/50"
                  )}
                />
                {liveCount ? `${liveCount} live mark${liveCount === 1 ? "" : "s"}` : "Marks at entry"}
              </span>
            </div>
            <p
              className={cn(
                "mt-2 text-4xl font-semibold tracking-tight",
                NUMERIC_DISPLAY_CLASS,
                tone(bookPnl)
              )}
            >
              {money(bookPnl, currency, true)}
            </p>
          </div>
          <div className="relative mt-6 grid grid-cols-2 gap-3 border-t border-border/70 pt-4">
            <div>
              <p className={labelClass}>Open (Unrealized)</p>
              <p className={cn("mt-1 text-base font-semibold", NUMERIC_CLASS, tone(openPnl))}>
                {money(openPnl, currency, true)}
              </p>
            </div>
            <div>
              <p className={labelClass}>Realized</p>
              <p className={cn("mt-1 text-base font-semibold", NUMERIC_CLASS, tone(summary.realizedPnl))}>
                {money(summary.realizedPnl, currency, true)}
              </p>
            </div>
          </div>
        </div>

        <div className={cn(APP_CARD_GRID_SURFACE_CLASS, "grid gap-px")}>
          <div className="grid grid-cols-2 gap-px sm:grid-cols-4">
          <KpiCell
            label="Open Structures"
            value={open.length}
            sub={`${credits} credit · ${debits} debit`}
          />
          <KpiCell
            label="Capital At Risk"
            value={money(capitalAtRisk, currency)}
            sub="Sum of max loss on open trades"
            valueClassName="text-rose-600 dark:text-rose-400"
          />
          <KpiCell
            label="Margin Deployed"
            value={margin ? money(margin, currency) : "—"}
            sub={margin ? "From broker margin figures" : "Add margin via screenshot"}
          />
          <KpiCell
            label="Premium Received"
            value={money(premiumIn, currency)}
            sub={premiumOut ? `${money(premiumOut, currency)} paid on debits` : "Credit collected on open trades"}
            valueClassName="text-emerald-600 dark:text-emerald-400"
          />
          </div>
          <div className="grid grid-cols-3 gap-px">
          <KpiCell
            label="Win Rate"
            value={closed.length ? `${summary.winRate.toFixed(0)}%` : "—"}
            sub={`${closed.length} closed · PF ${summary.profitFactor === Infinity ? "∞" : summary.profitFactor.toFixed(2)}`}
          />
          <KpiCell
            label="Total Win"
            value={money(summary.totalWin, currency)}
            sub={
              summary.winningTrades
                ? `${summary.winningTrades} winning trade${summary.winningTrades === 1 ? "" : "s"}`
                : "No winning trades yet"
            }
            valueClassName={
              summary.totalWin > 0
                ? "text-emerald-600 dark:text-emerald-400"
                : undefined
            }
          />
          <KpiCell
            label="Total Loss"
            value={money(-summary.totalLoss, currency)}
            sub={
              summary.losingTrades
                ? `${summary.losingTrades} losing trade${summary.losingTrades === 1 ? "" : "s"}`
                : "No losing trades yet"
            }
            valueClassName={
              summary.totalLoss > 0
                ? "text-rose-600 dark:text-rose-400"
                : undefined
            }
          />
          </div>
        </div>
      </section>

      <section className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
        <DataPanel
          title="Risk Monitor"
          subtitle="Open trades ranked by how close they are to stop or target."
          meta={flagged ? `${flagged} need attention` : "All in range"}
          bodyClassName="p-0 sm:p-0"
        >
          {alerts.length === 0 ? (
            <div className="p-4">
              <PanelEmpty title="No open positions" />
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {alerts.slice(0, 6).map((row) => (
                <li key={row.position.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {row.position.underlying}
                      </p>
                      <RiskPill state={row.risk} />
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {row.position.strategyLabel}
                      {row.position.dte != null ? ` · ${row.position.dte}d` : ""}
                    </p>
                  </div>
                  <div className="w-[9.5rem] shrink-0">
                    <TargetStopProgressBar
                      trade={row.position.source}
                      currentPrice={row.mark}
                      compact
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </DataPanel>

        <DataPanel
          title="Concentration"
          subtitle="Share of capital at risk by underlying."
          meta={conc[0] && conc[0].share > 40 ? "Concentrated" : "Diversified"}
        >
          {conc.length === 0 ? (
            <PanelEmpty title="No open exposure" />
          ) : (
            <div className="space-y-3.5">
              {conc.slice(0, 6).map((row) => (
                <div key={row.underlying}>
                  <div className="flex items-baseline justify-between gap-2 text-xs">
                    <span className="flex items-center gap-1.5 font-semibold text-foreground">
                      {row.underlying}
                      <span className="font-normal text-muted-foreground">
                        {row.count} trade{row.count === 1 ? "" : "s"}
                      </span>
                    </span>
                    <span className={cn("text-muted-foreground", NUMERIC_CLASS)}>
                      {money(row.capitalAtRisk, currency)} · {row.share.toFixed(0)}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        row.share > 40 ? "bg-amber-500/80" : "bg-primary/70"
                      )}
                      style={{ width: `${Math.max(row.share, 2)}%` }}
                    />
                  </div>
                </div>
              ))}
              {conc[0] && conc[0].share > 40 ? (
                <p className="flex items-start gap-1.5 rounded-md bg-amber-500/10 px-2.5 py-2 text-[11px] leading-snug text-amber-800 dark:text-amber-200">
                  <AlertTriangle className="mt-px size-3.5 shrink-0" />
                  {conc[0].underlying} carries {conc[0].share.toFixed(0)}% of your risk. One bad move there hits the whole book.
                </p>
              ) : null}
            </div>
          )}
        </DataPanel>
      </section>

      <section className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <DataPanel
          title="Expiry Ladder"
          subtitle="Capital at risk and decay by expiration date."
          meta={expiringSoon ? `${expiringSoon} expiring ≤ 7d` : `${ladder.length} expiries`}
          bodyClassName="p-0 sm:p-0"
        >
          {ladder.length === 0 ? (
            <div className="p-4">
              <PanelEmpty title="No open expiries" hint="Add expiry dates to your legs to build the ladder." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] text-left">
                <thead className="border-b border-border bg-muted/20">
                  <tr className="text-[11px] font-semibold tracking-wide text-muted-foreground">
                    <th className="px-4 py-2.5">Expiry</th>
                    <th className="px-3 py-2.5 text-center">DTE</th>
                    <th className="px-3 py-2.5 text-center">Trades</th>
                    <th className="px-3 py-2.5">Capital At Risk</th>
                    <th className="px-3 py-2.5 text-right">Θ / Day</th>
                    <th className="px-4 py-2.5 text-right">P&amp;L</th>
                  </tr>
                </thead>
                <tbody>
                  {ladder.map((bucket) => (
                    <tr key={bucket.expiry} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <CalendarClock className="size-3.5 text-muted-foreground" />
                          <span className="text-sm font-medium text-foreground">
                            {format(parseISO(bucket.expiry), "EEE, d MMM")}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate pl-5.5 text-[11px] text-muted-foreground">
                          {bucket.positions.map((p) => p.position.underlying).join(", ")}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={cn(
                            "inline-flex min-w-10 justify-center rounded-md px-1.5 py-0.5 text-xs font-semibold ring-1",
                            NUMERIC_CLASS,
                            bucket.dte <= 3
                              ? "bg-rose-500/12 text-rose-700 ring-rose-500/30 dark:text-rose-300"
                              : bucket.dte <= 7
                                ? "bg-amber-500/12 text-amber-700 ring-amber-500/30 dark:text-amber-300"
                                : "bg-muted text-foreground ring-border"
                          )}
                        >
                          {bucket.dte < 0 ? "Exp" : `${bucket.dte}d`}
                        </span>
                      </td>
                      <td className={cn("px-3 py-3 text-center text-sm", NUMERIC_CLASS)}>
                        {bucket.positions.length}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="h-1.5 min-w-[6rem] flex-1 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-rose-500/70"
                              style={{ width: `${(bucket.capitalAtRisk / maxBucketRisk) * 100}%` }}
                            />
                          </div>
                          <span className={cn("w-20 text-right text-xs text-foreground", NUMERIC_CLASS)}>
                            {money(bucket.capitalAtRisk, currency)}
                          </span>
                        </div>
                      </td>
                      <td className={cn("px-3 py-3 text-right text-sm", NUMERIC_CLASS, tone(bucket.theta))}>
                        {money(bucket.theta, currency, true)}
                      </td>
                      <td className={cn("px-4 py-3 text-right text-sm font-medium", NUMERIC_CLASS, tone(bucket.pnl))}>
                        {money(bucket.pnl, currency, true)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DataPanel>

        <DataPanel
          title="Realized Premium"
          subtitle="Booked options P&L by month of exit."
          meta="Last 6 months"
        >
          <div className="flex h-44 items-stretch gap-2 sm:gap-3">
            {months.map((m) => {
              const height = (Math.abs(m.pnl) / maxMonth) * 50;
              return (
                <div key={m.key} className="flex min-w-0 flex-1 flex-col items-center">
                  <div className="relative w-full flex-1">
                    <div className="absolute inset-x-0 top-1/2 h-px bg-border" />
                    {m.pnl !== 0 ? (
                      <div
                        className={cn(
                          "absolute inset-x-[18%] rounded-sm",
                          m.pnl > 0
                            ? "bottom-1/2 bg-emerald-500/75"
                            : "top-1/2 bg-rose-500/75"
                        )}
                        style={{ height: `${Math.max(height, 2)}%` }}
                        title={`${m.label}: ${money(m.pnl, currency, true)} · ${m.trades} trades`}
                      />
                    ) : null}
                  </div>
                  <p className="mt-1.5 text-[10px] font-medium tracking-wide text-muted-foreground">
                    {m.label}
                  </p>
                  <p className={cn("text-[10px]", NUMERIC_CLASS, tone(m.pnl))}>
                    {m.trades ? money(m.pnl, currency, true) : "—"}
                  </p>
                </div>
              );
            })}
          </div>
        </DataPanel>
      </section>

      <DataPanel
        title="Position Greeks"
        subtitle="Per-trade mark, P&L and sensitivities."
        meta={`${desk.length} open`}
        flush
      >
        {desk.length === 0 ? (
          <div className="p-4">
            <PanelEmpty title="No open positions" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] text-left">
              <thead className="border-b border-border bg-muted/20">
                <tr className="text-[11px] font-semibold tracking-wide text-muted-foreground">
                  <th className="px-4 py-2.5">Position</th>
                  <th className="px-3 py-2.5 text-right">Spot</th>
                  <th className="px-3 py-2.5 text-right">Mark</th>
                  <th className="px-3 py-2.5 text-right">P&amp;L</th>
                  <th className="px-3 py-2.5 text-right">Δ 1%</th>
                  <th className="px-3 py-2.5 text-right">Θ / Day</th>
                  <th className="px-3 py-2.5 text-right">ν +1pt</th>
                  <th className="px-3 py-2.5 text-right">At Risk</th>
                  <th className="px-4 py-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {desk.map((row) => (
                  <PositionRow key={row.position.id} row={row} currency={currency} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DataPanel>
    </div>
  );
}

function PositionRow({ row, currency }: { row: DeskPosition; currency: CurrencyCode }) {
  const cell = cn("px-3 py-3 text-right text-sm", NUMERIC_CLASS);
  const g = row.greeks;
  return (
    <tr className="border-b border-border/60 last:border-0 hover:bg-muted/15">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">
            {row.position.underlying}
          </span>
          <OptionsStrategyBadge category={row.position.strategyCategory} />
        </div>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {row.position.strategyLabel}
          {row.position.dte != null ? ` · ${row.position.dte}d to expiry` : ""}
        </p>
      </td>
      <td className={cell}>
        {row.spot != null ? (
          <span className="inline-flex items-center gap-1.5">
            <span
              className={cn(
                "size-1.5 rounded-full",
                row.spotSource === "live" ? "bg-emerald-500" : "bg-muted-foreground/50"
              )}
              title={row.spotSource === "live" ? "Live quote" : "Price at entry"}
            />
            {row.spot.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
          </span>
        ) : (
          "—"
        )}
      </td>
      <td className={cell}>
        {row.mark != null ? row.mark.toFixed(2) : "—"}
      </td>
      <td className={cn(cell, "font-medium", tone(row.pnl))}>
        {money(row.pnl, currency, true)}
      </td>
      <td className={cn(cell, g ? tone(g.delta1Pct) : "")}>
        {g ? money(g.delta1Pct, currency, true) : "—"}
      </td>
      <td className={cn(cell, g ? tone(g.theta) : "")}>
        {g ? money(g.theta, currency, true) : "—"}
      </td>
      <td className={cn(cell, g ? tone(g.vega) : "")}>
        {g ? money(g.vega, currency, true) : "—"}
      </td>
      <td className={cell}>
        {row.capitalAtRisk ? money(row.capitalAtRisk, currency) : "—"}
      </td>
      <td className="px-4 py-3 text-center">
        <RiskPill state={row.risk} />
      </td>
    </tr>
  );
}
