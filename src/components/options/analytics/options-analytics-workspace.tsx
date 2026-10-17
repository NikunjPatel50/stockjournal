"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Area, AreaChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts";
import {
  ArrowDownRight,
  ArrowUpRight,
  CircleDot,
  Clock3,
  Lightbulb,
  Scale,
  Target,
} from "lucide-react";
import { AppPageHeader } from "@/components/app-page-header";
import { DataPanel, PanelEmpty } from "@/components/data-panel";
import { useRegionTrades } from "@/components/journal/journal-market-provider";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
import { useMarketQuotes } from "@/hooks/use-market-quotes";
import { APP_CARD_SURFACE_CLASS, APP_PAGE_SHELL_CLASS } from "@/lib/app-shell";
import {
  buildOptionsAnalytics,
  OPTIONS_ANALYTICS_RANGES,
  type BreakdownRow,
  type EquityPoint,
  type Insight,
  type OptionsAnalyticsRange,
} from "@/lib/options-analytics";
import { optionsPositionFromTrade, type OptionsPositionView } from "@/lib/options-journal";
import { optionsOpenUnrealizedPnl } from "@/lib/options-spread-mark";
import type { CurrencyCode } from "@/lib/settings";
import { cn, NUMERIC_CLASS, NUMERIC_DISPLAY_CLASS } from "@/lib/utils";

function formatMoney(value: number, currency: CurrencyCode, signed = true) {
  const locale = currency === "INR" ? "en-IN" : "en-US";
  const abs = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Math.abs(Math.round(value)));
  if (Math.round(value) === 0) return abs;
  if (!signed) return value < 0 ? `−${abs}` : abs;
  return `${value > 0 ? "+" : "−"}${abs}`;
}

function tone(value: number) {
  if (Math.round(value) > 0) return "text-emerald-600 dark:text-emerald-400";
  if (Math.round(value) < 0) return "text-rose-600 dark:text-rose-400";
  return "text-foreground";
}

function formatDays(days: number) {
  if (days < 1) return "< 1 day";
  const rounded = days < 10 ? Math.round(days * 10) / 10 : Math.round(days);
  return `${rounded} day${rounded === 1 ? "" : "s"}`;
}

function pf(value: number) {
  if (value === Infinity) return "∞";
  return value.toFixed(2);
}

const labelClass =
  "text-[11px] font-semibold tracking-wide text-muted-foreground";

const TONE_CHIP = {
  positive: "bg-emerald-500/12 text-emerald-700 ring-emerald-500/30 dark:text-emerald-300",
  negative: "bg-rose-500/12 text-rose-700 ring-rose-500/30 dark:text-rose-300",
  neutral: "bg-muted text-muted-foreground ring-border",
} as const;

function ScoreBlock({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 px-5 py-5", className)}>
      <p className={labelClass}>{label}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

/** Wins, losses and flat trades as one bar, with the break-even win rate marked. */
function WinLossBar({
  wins,
  losses,
  total,
  breakeven,
}: {
  wins: number;
  losses: number;
  total: number;
  breakeven: number | null;
}) {
  const pctOf = (n: number) => (total ? (n / total) * 100 : 0);
  const flat = Math.max(0, total - wins - losses);
  return (
    <div>
      <div className="relative">
        <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
          <div className="bg-emerald-500" style={{ width: `${pctOf(wins)}%` }} />
          <div className="bg-rose-500" style={{ width: `${pctOf(losses)}%` }} />
          <div className="bg-muted-foreground/30" style={{ width: `${pctOf(flat)}%` }} />
        </div>
        {breakeven != null ? (
          <span
            aria-hidden
            className="absolute -top-1 h-4.5 w-0.5 rounded-full bg-foreground"
            style={{ left: `calc(${Math.min(100, breakeven)}% - 1px)` }}
          />
        ) : null}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          {wins} Won
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="size-1.5 rounded-full bg-rose-500" />
          {losses} Lost
        </span>
        {flat ? (
          <span className="inline-flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-muted-foreground/40" />
            {flat} Flat
          </span>
        ) : null}
        {breakeven != null ? (
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-0.5 rounded-full bg-foreground" />
            Break-even {Math.round(breakeven)}%
          </span>
        ) : null}
      </div>
    </div>
  );
}

/** Profit factor on a 0–3 scale: red below 1, amber to 1.5, green above. */
function ProfitFactorScale({ value }: { value: number | null }) {
  const pos = value == null ? null : Math.min(3, value === Infinity ? 3 : value) / 3;
  return (
    <div>
      <div className="relative">
        <div className="flex h-2.5 overflow-hidden rounded-full">
          <div className="w-1/3 bg-rose-500/30" />
          <div className="w-1/6 bg-amber-500/35" />
          <div className="flex-1 bg-emerald-500/35" />
        </div>
        {pos != null ? (
          <span
            aria-hidden
            className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-foreground shadow"
            style={{ left: `${pos * 100}%` }}
          />
        ) : null}
      </div>
      <div className={cn("mt-1.5 flex justify-between text-[10px] text-muted-foreground", NUMERIC_CLASS)}>
        <span>0</span>
        <span className="-translate-x-1">1.0</span>
        <span>2.0</span>
        <span>3+</span>
      </div>
    </div>
  );
}

function LedgerPanel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={cn(APP_CARD_SURFACE_CLASS, "flex min-w-0 flex-col")}>
      <header className="flex items-center gap-2 border-b border-border px-4 py-3">
        <span className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
          {icon}
        </span>
        <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
      </header>
      <dl className="flex-1 divide-y divide-border/60">{children}</dl>
    </section>
  );
}

function LedgerRow({
  label,
  hint,
  value,
  valueClassName,
}: {
  label: string;
  hint: string;
  value: ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        <dt className="text-sm font-medium text-foreground">{label}</dt>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{hint}</p>
      </div>
      <dd
        className={cn(
          "shrink-0 text-right text-base font-semibold",
          NUMERIC_DISPLAY_CLASS,
          valueClassName
        )}
      >
        {value}
      </dd>
    </div>
  );
}

/** Average win against average loss as two bars on a shared scale. */
function PayoffBars({
  avgWin,
  avgLoss,
  money,
}: {
  avgWin: number;
  avgLoss: number;
  money: (v: number) => string;
}) {
  const max = Math.max(avgWin, avgLoss, 1);
  const rows = [
    { label: "Avg Win", value: avgWin, bar: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", shown: avgWin ? money(avgWin) : "—" },
    { label: "Avg Loss", value: avgLoss, bar: "bg-rose-500", text: "text-rose-600 dark:text-rose-400", shown: avgLoss ? money(-avgLoss) : "—" },
  ];
  return (
    <div className="space-y-2.5 px-4 py-3.5">
      {rows.map((row) => (
        <div key={row.label}>
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-medium text-foreground">{row.label}</span>
            <span className={cn("font-semibold", NUMERIC_DISPLAY_CLASS, row.value ? row.text : "text-muted-foreground")}>
              {row.shown}
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
            <div className={cn("h-full rounded-full", row.bar)} style={{ width: `${(row.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function InsightRow({ insight }: { insight: Insight }) {
  const Icon =
    insight.tone === "positive"
      ? ArrowUpRight
      : insight.tone === "negative"
        ? ArrowDownRight
        : CircleDot;
  return (
    <li className="flex gap-3 py-2.5">
      <span
        className={cn(
          "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md ring-1",
          TONE_CHIP[insight.tone]
        )}
      >
        <Icon className="size-3.5" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{insight.title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{insight.detail}</p>
      </div>
    </li>
  );
}

function BarCell({ value, max }: { value: number; max: number }) {
  const width = max > 0 ? (Math.abs(value) / max) * 100 : 0;
  return (
    <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={cn("h-full rounded-full", value >= 0 ? "bg-emerald-500/75" : "bg-rose-500/75")}
        style={{ width: `${Math.max(width, value === 0 ? 0 : 3)}%` }}
      />
    </div>
  );
}

function BreakdownTable({
  rows,
  currency,
  firstColumn,
}: {
  rows: BreakdownRow[];
  currency: CurrencyCode;
  firstColumn: string;
}) {
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.pnl)));
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[34rem] text-left">
        <thead className="border-b border-border bg-muted/20">
          <tr className={cn(labelClass, "[&>th]:py-2.5")}>
            <th className="px-4">{firstColumn}</th>
            <th className="px-3 text-center">Trades</th>
            <th className="px-3 text-right">Win Rate</th>
            <th className="px-3 text-right">PF</th>
            <th className="px-3 text-right">Avg / Trade</th>
            <th className="w-[26%] px-4">Net P&amp;L</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-b border-border/60 last:border-0">
              <td className="px-4 py-3 text-sm font-medium text-foreground">{row.label}</td>
              <td className={cn("px-3 py-3 text-center text-sm", NUMERIC_CLASS)}>{row.trades}</td>
              <td className={cn("px-3 py-3 text-right text-sm", NUMERIC_CLASS)}>
                {Math.round(row.winRate)}%
              </td>
              <td className={cn("px-3 py-3 text-right text-sm", NUMERIC_CLASS)}>
                {pf(row.profitFactor)}
              </td>
              <td className={cn("px-3 py-3 text-right text-sm", NUMERIC_CLASS, tone(row.avg))}>
                {formatMoney(row.avg, currency)}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <BarCell value={row.pnl} max={max} />
                  <span
                    className={cn(
                      "w-20 shrink-0 text-right text-sm font-medium",
                      NUMERIC_CLASS,
                      tone(row.pnl)
                    )}
                  >
                    {formatMoney(row.pnl, currency)}
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ColumnBars({
  rows,
  currency,
  emptyLabel,
}: {
  rows: BreakdownRow[];
  currency: CurrencyCode;
  emptyLabel: string;
}) {
  if (rows.length === 0) return <PanelEmpty title={emptyLabel} />;
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.pnl)));
  return (
    <div className="flex h-48 items-stretch gap-2">
      {rows.map((row) => {
        const h = (Math.abs(row.pnl) / max) * 46;
        return (
          <div key={row.key} className="flex min-w-0 flex-1 flex-col items-center">
            <div className="relative w-full flex-1">
              <div className="absolute inset-x-0 top-1/2 h-px bg-border" />
              {row.pnl !== 0 ? (
                <div
                  className={cn(
                    "absolute inset-x-[16%] rounded-sm",
                    row.pnl > 0 ? "bottom-1/2 bg-emerald-500/75" : "top-1/2 bg-rose-500/75"
                  )}
                  style={{ height: `${Math.max(h, 2)}%` }}
                  title={`${row.label}: ${formatMoney(row.pnl, currency)}`}
                />
              ) : null}
            </div>
            <p className="mt-1.5 truncate text-[10px] font-medium text-muted-foreground">
              {row.label}
            </p>
            <p className={cn("text-[10px]", NUMERIC_CLASS, tone(row.pnl))}>
              {formatMoney(row.pnl, currency)}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {row.trades}t · {Math.round(row.winRate)}%
            </p>
          </div>
        );
      })}
    </div>
  );
}

const equityConfig = {
  equity: { label: "Cumulative P&L", color: "#10b981" },
  drawdown: { label: "Drawdown", color: "#f43f5e" },
} satisfies ChartConfig;

function EquityTooltip({
  active,
  payload,
  currency,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: EquityPoint }>;
  currency: CurrencyCode;
}) {
  const row = active ? payload?.[0]?.payload : undefined;
  if (!row) return null;
  return (
    <div className="min-w-[11rem] rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1.5 font-semibold text-foreground">{row.label}</p>
      <div className="flex justify-between gap-4">
        <span className="text-muted-foreground">Day P&amp;L</span>
        <span className={cn(NUMERIC_CLASS, tone(row.pnl))}>{formatMoney(row.pnl, currency)}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-muted-foreground">Cumulative</span>
        <span className={cn(NUMERIC_CLASS, tone(row.equity))}>
          {formatMoney(row.equity, currency)}
        </span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-muted-foreground">Drawdown</span>
        <span className={cn(NUMERIC_CLASS, row.drawdown < 0 ? "text-rose-600 dark:text-rose-400" : "")}>
          {formatMoney(row.drawdown, currency)}
        </span>
      </div>
    </div>
  );
}

function EquityChart({ points, currency }: { points: EquityPoint[]; currency: CurrencyCode }) {
  if (points.length === 0) return <PanelEmpty title="No closed trades in this period" />;
  const data =
    points.length === 1
      ? [{ key: "start", label: "Start", pnl: 0, equity: 0, drawdown: 0 }, ...points]
      : points;
  return (
    <ChartContainer config={equityConfig} className="aspect-auto h-64 w-full">
      <AreaChart data={data} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="opt-equity" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="opt-dd" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f43f5e" stopOpacity={0} />
            <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.35} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} minTickGap={24} />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={72}
          tick={{ fontSize: 10 }}
          tickFormatter={(v) => formatMoney(Number(v), currency)}
        />
        <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 4" />
        <ChartTooltip cursor={false} content={<EquityTooltip currency={currency} />} />
        <Area
          type="monotone"
          dataKey="drawdown"
          stroke="#f43f5e"
          strokeWidth={1}
          fill="url(#opt-dd)"
          isAnimationActive={false}
        />
        <Area
          type="monotone"
          dataKey="equity"
          stroke="#10b981"
          strokeWidth={2}
          fill="url(#opt-equity)"
          isAnimationActive={false}
        />
      </AreaChart>
    </ChartContainer>
  );
}

function StyleCompare({ rows, currency }: { rows: BreakdownRow[]; currency: CurrencyCode }) {
  const credit = rows.find((r) => r.key === "credit");
  const debit = rows.find((r) => r.key === "debit");
  const sides = [
    { row: credit, label: "Credit", hint: "Premium sellers", accent: "bg-emerald-500" },
    { row: debit, label: "Debit", hint: "Premium buyers", accent: "bg-sky-500" },
  ];
  const total = (credit?.trades ?? 0) + (debit?.trades ?? 0);
  return (
    <div className="space-y-4">
      <div>
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>Credit {credit?.trades ?? 0}</span>
          <span>Debit {debit?.trades ?? 0}</span>
        </div>
        <div className="mt-1.5 flex h-2 overflow-hidden rounded-full bg-muted">
          <div className="bg-emerald-500/80" style={{ width: `${total ? ((credit?.trades ?? 0) / total) * 100 : 0}%` }} />
          <div className="bg-sky-500/75" style={{ width: `${total ? ((debit?.trades ?? 0) / total) * 100 : 0}%` }} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {sides.map(({ row, label, hint, accent }) => (
          <div key={label} className="rounded-lg border border-border/70 bg-muted/20 p-3">
            <div className="flex items-center gap-1.5">
              <span className={cn("size-2 rounded-full", accent)} />
              <p className="text-xs font-semibold text-foreground">{label}</p>
            </div>
            <p className="text-[10px] text-muted-foreground">{hint}</p>
            {row ? (
              <>
                <p className={cn("mt-3 text-xl font-semibold", NUMERIC_DISPLAY_CLASS, tone(row.pnl))}>
                  {formatMoney(row.pnl, currency)}
                </p>
                <dl className="mt-2 space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Win rate</dt>
                    <dd className={NUMERIC_CLASS}>{Math.round(row.winRate)}%</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Avg / trade</dt>
                    <dd className={cn(NUMERIC_CLASS, tone(row.avg))}>{formatMoney(row.avg, currency)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Profit factor</dt>
                    <dd className={NUMERIC_CLASS}>{pf(row.profitFactor)}</dd>
                  </div>
                </dl>
              </>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">No trades</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function OptionsAnalyticsWorkspace() {
  const { trades: regionTrades, currency } = useRegionTrades();
  const { getQuote, quoteRevision } = useMarketQuotes();
  const [range, setRange] = useState<OptionsAnalyticsRange>("all");
  const money = useCallback((v: number) => formatMoney(v, currency), [currency]);

  const positions = useMemo(
    () => regionTrades.filter((t) => t.assetClass === "Options").map(optionsPositionFromTrade),
    [regionTrades]
  );
  const a = useMemo(() => {
    void quoteRevision;
    const openPnl = (p: OptionsPositionView) =>
      optionsOpenUnrealizedPnl(p.source, getQuote(p.source)?.price ?? null);
    return buildOptionsAnalytics(positions, range, money, openPnl);
  }, [positions, range, money, getQuote, quoteRevision]);
  const { kpis } = a;
  const closedCount = kpis.trades - kpis.openTrades;

  const segmentClass = (active: boolean) =>
    cn(
      "rounded-[5px] px-3 py-1 text-xs font-semibold transition-colors",
      active
        ? "bg-emerald-600 text-white shadow-sm"
        : "text-muted-foreground hover:text-foreground"
    );

  const controls = (
    <div className="inline-flex rounded-md border border-border bg-muted/60 p-0.5">
      {OPTIONS_ANALYTICS_RANGES.map((r) => (
        <button
          key={r.value}
          type="button"
          onClick={() => setRange(r.value)}
          className={segmentClass(range === r.value)}
        >
          {r.label}
        </button>
      ))}
    </div>
  );

  const header = (
    <AppPageHeader
      eyebrow="Options Analytics"
      title="Analytics"
      description="Booked results plus open positions at their live mark, and where the edge comes from."
      pageActions={controls}
    />
  );

  if (kpis.trades === 0) {
    return (
      <div className={APP_PAGE_SHELL_CLASS}>
        {header}
        <PanelEmpty
          title={positions.length === 0 ? "No options trades yet" : "No trades in this period"}
          hint={
            positions.length === 0
              ? "Log options trades in the journal. Performance, edge and insights will show up here."
              : "Pick a longer range."
          }
          className="min-h-[16rem]"
        />
      </div>
    );
  }

  const management = [a.management.early, a.management.expiry].filter(
    (r): r is BreakdownRow => r != null
  );
  const decided = kpis.wins + kpis.losses > 0;
  const winCushion =
    decided && kpis.breakevenWinRate != null ? kpis.winRate - kpis.breakevenWinRate : null;
  const maxCapture = Math.max(1, ...a.captureBuckets.map((b) => b.count));
  const hasCapture = a.captureBuckets.some((b) => b.count > 0);

  return (
    <div className={APP_PAGE_SHELL_CLASS}>
      {header}

      <section
        className={cn(
          APP_CARD_SURFACE_CLASS,
          "grid min-w-0 grid-cols-1 divide-y divide-border lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,1fr)] lg:divide-x lg:divide-y-0"
        )}
      >
        <ScoreBlock label="Net P&L">
          <p className={cn("text-4xl font-semibold tracking-tight", NUMERIC_DISPLAY_CLASS, tone(kpis.netPnl))}>
            {formatMoney(kpis.netPnl, currency)}
          </p>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
            <span>
              Booked{" "}
              <span className={cn("font-semibold", NUMERIC_CLASS, tone(kpis.realizedPnl))}>
                {formatMoney(kpis.realizedPnl, currency)}
              </span>
            </span>
            {kpis.openTrades ? (
              <span>
                Open{" "}
                <span className={cn("font-semibold", NUMERIC_CLASS, tone(kpis.unrealizedPnl))}>
                  {formatMoney(kpis.unrealizedPnl, currency)}
                </span>
              </span>
            ) : null}
            <span>
              {closedCount} closed{kpis.openTrades ? ` · ${kpis.openTrades} open` : ""}
            </span>
          </div>
        </ScoreBlock>

        <ScoreBlock label="Win Rate">
          <div className="flex items-baseline justify-between gap-3">
            <p className={cn("text-3xl font-semibold tracking-tight", NUMERIC_DISPLAY_CLASS)}>
              {decided ? `${Math.round(kpis.winRate)}%` : "—"}
            </p>
            {winCushion != null ? (
              <span
                className={cn(
                  "text-xs font-medium",
                  NUMERIC_CLASS,
                  winCushion >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                )}
              >
                {winCushion >= 0 ? "+" : "−"}
                {Math.abs(Math.round(winCushion))} pts vs break-even
              </span>
            ) : null}
          </div>
          <div className="mt-3">
            <WinLossBar
              wins={kpis.wins}
              losses={kpis.losses}
              total={kpis.trades}
              breakeven={kpis.breakevenWinRate}
            />
          </div>
        </ScoreBlock>

        <ScoreBlock label="Profit Factor">
          <div className="flex items-baseline justify-between gap-3">
            <p
              className={cn(
                "text-3xl font-semibold tracking-tight",
                NUMERIC_DISPLAY_CLASS,
                !decided
                  ? "text-foreground"
                  : kpis.profitFactor >= 1
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
              )}
            >
              {decided ? pf(kpis.profitFactor) : "—"}
            </p>
            <span className="text-xs text-muted-foreground">Gross win ÷ gross loss</span>
          </div>
          <div className="mt-3">
            <ProfitFactorScale value={decided ? kpis.profitFactor : null} />
          </div>
        </ScoreBlock>
      </section>

      <section className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <LedgerPanel title="Edge" icon={<Target className="size-3.5" />}>
          <LedgerRow
            label="Expectancy"
            hint="Average P&L per trade"
            value={formatMoney(kpis.expectancy, currency)}
            valueClassName={tone(kpis.expectancy)}
          />
          <LedgerRow
            label="Return On Risk"
            hint="Net P&L ÷ capital at risk"
            value={kpis.returnOnRisk == null ? "—" : `${kpis.returnOnRisk >= 0 ? "+" : ""}${kpis.returnOnRisk.toFixed(1)}%`}
            valueClassName={kpis.returnOnRisk == null ? undefined : tone(kpis.returnOnRisk)}
          />
          <LedgerRow
            label="Break-Even Win Rate"
            hint="Needed at your win / loss size"
            value={kpis.breakevenWinRate == null ? "—" : `${Math.round(kpis.breakevenWinRate)}%`}
          />
          <LedgerRow
            label="Profit Captured"
            hint="Of max profit, on winners"
            value={kpis.avgCapture == null ? "—" : `${Math.round(kpis.avgCapture)}%`}
          />
        </LedgerPanel>

        <LedgerPanel title="Payoff" icon={<Scale className="size-3.5" />}>
          <PayoffBars
            avgWin={kpis.avgWin}
            avgLoss={kpis.avgLoss}
            money={(v) => formatMoney(v, currency, false)}
          />
          <LedgerRow
            label="Win / Loss Size"
            hint="Avg win ÷ avg loss"
            value={kpis.avgLoss > 0 && kpis.avgWin > 0 ? `${(kpis.avgWin / kpis.avgLoss).toFixed(2)}×` : "—"}
          />
          <LedgerRow
            label="Largest Win"
            hint="Best single trade"
            value={kpis.largestWin ? formatMoney(kpis.largestWin, currency) : "—"}
            valueClassName={kpis.largestWin ? tone(kpis.largestWin) : undefined}
          />
          <LedgerRow
            label="Largest Loss"
            hint="Worst single trade"
            value={kpis.largestLoss ? formatMoney(kpis.largestLoss, currency) : "—"}
            valueClassName={kpis.largestLoss ? tone(kpis.largestLoss) : undefined}
          />
        </LedgerPanel>

        <LedgerPanel title="Risk & Time" icon={<Clock3 className="size-3.5" />}>
          <LedgerRow
            label="Max Drawdown"
            hint="Deepest fall from a peak"
            value={formatMoney(kpis.maxDrawdown, currency, false)}
            valueClassName={kpis.maxDrawdown < 0 ? "text-rose-600 dark:text-rose-400" : undefined}
          />
          <LedgerRow
            label="Current Drawdown"
            hint={kpis.currentDrawdown < 0 ? "Below your equity peak" : "At an equity high"}
            value={formatMoney(kpis.currentDrawdown, currency, false)}
            valueClassName={kpis.currentDrawdown < 0 ? "text-rose-600 dark:text-rose-400" : undefined}
          />
          <LedgerRow
            label="Avg Hold"
            hint={kpis.openTrades ? "Entry to exit, open trades to today" : "Entry to exit"}
            value={formatDays(kpis.avgDaysHeld)}
          />
          <LedgerRow
            label="Avg DTE At Entry"
            hint="Days to expiry when opened"
            value={kpis.avgDteAtEntry == null ? "—" : formatDays(kpis.avgDteAtEntry)}
          />
        </LedgerPanel>
      </section>

      <section className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <DataPanel
          title="Equity Curve"
          subtitle={
            kpis.openTrades
              ? "Cumulative P&L, with open positions marked today. Drawdown shaded below zero."
              : "Cumulative realized P&L with drawdown shaded below zero."
          }
          meta={`${a.equity.length} trading day${a.equity.length === 1 ? "" : "s"}`}
        >
          <EquityChart points={a.equity} currency={currency} />
        </DataPanel>

        <DataPanel
          title="Key Takeaways"
          subtitle="What the numbers say, in plain words."
          action={<Lightbulb className="size-4 text-amber-500" />}
          bodyClassName="py-1 sm:py-1"
        >
          {a.insights.length ? (
            <ul className="divide-y divide-border/60">
              {a.insights.map((insight) => (
                <InsightRow key={insight.title} insight={insight} />
              ))}
            </ul>
          ) : (
            <PanelEmpty title="More trades needed" hint="Insights appear once a few trades are closed." />
          )}
        </DataPanel>
      </section>

      <section className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <DataPanel
          title="Performance By Strategy"
          subtitle="Which structures make and lose money."
          meta={`${a.byStrategy.length} strateg${a.byStrategy.length === 1 ? "y" : "ies"}`}
          flush
        >
          <BreakdownTable rows={a.byStrategy} currency={currency} firstColumn="Strategy" />
        </DataPanel>

        <DataPanel title="Credit Vs Debit" subtitle="Selling premium compared with buying it.">
          <StyleCompare rows={a.byStyle} currency={currency} />
        </DataPanel>
      </section>

      <section className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <DataPanel title="Days To Expiry At Entry" subtitle="Net P&L by how far out you traded.">
          <ColumnBars rows={a.byDte} currency={currency} emptyLabel="Add expiries to your legs" />
        </DataPanel>

        <DataPanel title="Entry Day" subtitle="Net P&L by the weekday you opened the trade.">
          <ColumnBars rows={a.byWeekday} currency={currency} emptyLabel="No weekday entries" />
        </DataPanel>

        <DataPanel title="Trade Management" subtitle="Closing early compared with holding to expiry.">
          <div className="space-y-4">
            {management.length ? (
              <div className="grid grid-cols-2 gap-3">
                {management.map((row) => (
                  <div key={row.key} className="rounded-lg border border-border/70 bg-muted/20 p-3">
                    <p className="text-xs font-semibold text-foreground">{row.label}</p>
                    <p className={cn("mt-2 text-lg font-semibold", NUMERIC_DISPLAY_CLASS, tone(row.pnl))}>
                      {formatMoney(row.pnl, currency)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {row.trades} trade{row.trades === 1 ? "" : "s"} · {Math.round(row.winRate)}% win
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Add expiries to compare.</p>
            )}
            <div>
              <p className={labelClass}>Profit Captured On Winners</p>
              {hasCapture ? (
                <div className="mt-2 space-y-1.5">
                  {a.captureBuckets.map((b) => (
                    <div key={b.label} className="flex items-center gap-2.5">
                      <span className={cn("w-14 shrink-0 text-[11px] text-muted-foreground", NUMERIC_CLASS)}>
                        {b.label}
                      </span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-emerald-500/75"
                          style={{ width: `${(b.count / maxCapture) * 100}%` }}
                        />
                      </div>
                      <span className={cn("w-5 text-right text-[11px]", NUMERIC_CLASS)}>{b.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">
                  Needs max profit from the broker screenshot.
                </p>
              )}
            </div>
          </div>
        </DataPanel>
      </section>

      <DataPanel
        title="Performance By Underlying"
        subtitle="Where your options P&L comes from."
        meta={`${a.byUnderlying.length} symbol${a.byUnderlying.length === 1 ? "" : "s"}`}
        flush
      >
        <BreakdownTable rows={a.byUnderlying} currency={currency} firstColumn="Underlying" />
      </DataPanel>
    </div>
  );
}
