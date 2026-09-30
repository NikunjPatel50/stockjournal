"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { DataPanel, PanelEmpty } from "@/components/data-panel";
import { formatMoney, formatPercent } from "@/lib/analytics";
import type { CurrencyCode } from "@/lib/settings";
import type { JournalTrade } from "@/lib/journal-types";
import { cn, NUMERIC_CLASS } from "@/lib/utils";

type EdgePanelProps = {
  trades: JournalTrade[];
  currency: CurrencyCode;
};

type Tone = "good" | "bad" | "neutral";

type Insight = {
  key: string;
  label: string;
  headline: string;
  detail: string;
  tone: Tone;
};

const TAPE_LIMIT = 40;
const WORST_LOSS_COUNT = 3;

function tradeTimeMs(trade: JournalTrade): number {
  const time = parseISO(trade.exitDate || trade.entryDate).getTime();
  return Number.isFinite(time) ? time : 0;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function formatHold(hours: number): string {
  if (hours < 24) return `${Math.max(1, Math.round(hours))}h`;
  const days = hours / 24;
  return `${days < 10 ? days.toFixed(1) : Math.round(days)}d`;
}

function average(values: number[]): number {
  return values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0;
}

function computeEdge(trades: JournalTrade[], currency: CurrencyCode) {
  const sorted = [...trades].sort((a, b) => tradeTimeMs(a) - tradeTimeMs(b));
  const wins = sorted.filter((t) => t.pnl > 0);
  const losses = sorted.filter((t) => t.pnl < 0);
  const netPnl = sorted.reduce((s, t) => s + t.pnl, 0);
  const decided = wins.length + losses.length;

  let streak = 0;
  let streakSign = 0;
  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    const sign = Math.sign(sorted[i].pnl);
    if (sign === 0) break;
    if (streakSign === 0) streakSign = sign;
    if (sign !== streakSign) break;
    streak += 1;
  }

  const insights: Insight[] = [];

  if (losses.length >= 2) {
    const lossSizes = losses.map((t) => Math.abs(t.pnl));
    const typicalLoss = median(lossSizes);
    const worst = [...losses]
      .sort((a, b) => a.pnl - b.pnl)
      .slice(0, Math.min(WORST_LOSS_COUNT, losses.length - 1));
    const worstCost = worst.reduce((s, t) => s + Math.abs(t.pnl), 0);
    const savings = worst.reduce(
      (s, t) => s + Math.max(0, Math.abs(t.pnl) - typicalLoss),
      0
    );
    const tickers = worst.map((t) => t.ticker).join(", ");
    insights.push({
      key: "leak",
      label: "Biggest leak",
      headline:
        savings > 0
          ? `${formatMoney(savings, true, currency)} left on the table`
          : "Losses are evenly sized",
      detail:
        savings > 0
          ? `Your ${worst.length} worst losses (${tickers}) cost ${formatMoney(worstCost, false, currency)}. Cut to your typical loss of ${formatMoney(typicalLoss, false, currency)}, net P&L would be ${formatMoney(netPnl + savings, true, currency)}.`
          : `No single loss is much bigger than your typical ${formatMoney(typicalLoss, false, currency)}. Stops are being respected.`,
      tone: savings > typicalLoss ? "bad" : "good",
    });
  }

  const winHolds = wins.map((t) => t.holdTimeHours).filter((h) => h > 0);
  const lossHolds = losses.map((t) => t.holdTimeHours).filter((h) => h > 0);
  if (winHolds.length > 0 && lossHolds.length > 0) {
    const winHold = average(winHolds);
    const lossHold = average(lossHolds);
    const ratio = winHold > 0 && lossHold > 0 ? lossHold / winHold : 1;
    const losersLonger = ratio > 1.1;
    const winnersLonger = ratio < 0.9;
    insights.push({
      key: "hold",
      label: "Holding pattern",
      headline: losersLonger
        ? `Losers held ${ratio.toFixed(1)}× longer`
        : winnersLonger
          ? `Winners run ${(1 / ratio).toFixed(1)}× longer`
          : "Similar hold on wins and losses",
      detail: `Average hold is ${formatHold(winHold)} on winners and ${formatHold(lossHold)} on losers.${
        losersLonger
          ? " Waiting on losing trades to come back is costing you."
          : winnersLonger
            ? " You cut losers fast and let winners work."
            : ""
      }`,
      tone: losersLonger ? "bad" : winnersLonger ? "good" : "neutral",
    });
  }

  if (wins.length > 0 && losses.length > 0) {
    const avgWin = average(wins.map((t) => t.pnl));
    const avgLoss = average(losses.map((t) => Math.abs(t.pnl)));
    const winRate = (wins.length / decided) * 100;
    const payoff = avgWin / avgLoss;
    const breakEven = (1 / (1 + payoff)) * 100;
    const neededAvgWin = (avgLoss * losses.length) / wins.length;
    const above = winRate >= breakEven;
    insights.push({
      key: "gap",
      label: "Break-even gap",
      headline: above
        ? `${(winRate - breakEven).toFixed(0)} pts above break-even`
        : `${(breakEven - winRate).toFixed(0)} pts below break-even`,
      detail: above
        ? `You win ${formatPercent(winRate)} of trades and need ${formatPercent(breakEven)} at a ${payoff.toFixed(2)}× payoff.`
        : `You win ${formatPercent(winRate)} but need ${formatPercent(breakEven)}. At this win rate, your average win has to reach ${formatMoney(neededAvgWin, false, currency)} (now ${formatMoney(avgWin, false, currency)}).`,
      tone: above ? "good" : "bad",
    });
  }

  return {
    tape: sorted.slice(-TAPE_LIMIT),
    decided,
    streak,
    streakSign,
    insights,
  };
}

function TradeTape({
  trades,
  currency,
}: {
  trades: JournalTrade[];
  currency: CurrencyCode;
}) {
  const maxAbs = Math.max(...trades.map((t) => Math.abs(t.pnl)), 1);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const active = activeIndex != null ? trades[activeIndex] : null;

  return (
    <div
      className="relative rounded-lg border border-border/70 bg-muted/20 px-3 py-3"
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") setActiveIndex(null);
      }}
    >
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Last {trades.length} trades, oldest to newest</span>
        <span className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
            Win
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-rose-500" aria-hidden />
            Loss
          </span>
        </span>
      </div>
      <div className="relative mt-2 flex h-20 items-stretch gap-[2px]">
        <span
          className="absolute inset-x-0 top-1/2 h-px bg-border"
          aria-hidden
        />
        {trades.map((trade, index) => {
          const height = Math.max(8, (Math.abs(trade.pnl) / maxAbs) * 100);
          const win = trade.pnl > 0;
          const flat = trade.pnl === 0;
          const isActive = activeIndex === index;
          return (
            <button
              key={`${trade.id}-${index}`}
              type="button"
              className={cn(
                "relative flex flex-1 flex-col rounded-sm outline-none transition-opacity focus-visible:ring-1 focus-visible:ring-ring",
                activeIndex != null && !isActive && "opacity-40",
                isActive && "bg-foreground/[0.06]"
              )}
              aria-label={`${trade.ticker}, ${formatMoney(trade.pnl, true, currency)}`}
              onPointerEnter={() => setActiveIndex(index)}
              onFocus={() => setActiveIndex(index)}
              onBlur={() => setActiveIndex(null)}
              onClick={() => setActiveIndex(isActive ? null : index)}
            >
              <span className="flex h-1/2 w-full items-end">
                {win ? (
                  <span
                    className="w-full rounded-t-sm bg-emerald-500/80"
                    style={{ height: `${height}%` }}
                  />
                ) : null}
              </span>
              <span className="flex h-1/2 w-full items-start">
                {!win && !flat ? (
                  <span
                    className="w-full rounded-b-sm bg-rose-500/80"
                    style={{ height: `${height}%` }}
                  />
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
      {active && activeIndex != null ? (
        <TradeHoverCard
          trade={active}
          currency={currency}
          position={(activeIndex + 0.5) / trades.length}
        />
      ) : null}
    </div>
  );
}

function TradeHoverCard({
  trade,
  currency,
  position,
}: {
  trade: JournalTrade;
  currency: CurrencyCode;
  position: number;
}) {
  const win = trade.pnl > 0;
  const loss = trade.pnl < 0;
  const exitTime = tradeTimeMs(trade);
  const r = trade.plannedRisk > 0 ? trade.pnl / trade.plannedRisk : null;
  const align =
    position < 0.25
      ? "translate-x-0"
      : position > 0.75
        ? "-translate-x-full"
        : "-translate-x-1/2";

  const rows: [string, string][] = [
    [
      "Entry → exit",
      `${formatPrice(trade.entryPrice, currency)} → ${formatPrice(trade.exitPrice, currency)}`,
    ],
    ["Quantity", trade.quantity.toLocaleString("en-IN")],
  ];
  if (trade.holdTimeHours > 0) rows.push(["Held", formatHold(trade.holdTimeHours)]);
  if (r != null) rows.push(["R multiple", `${r >= 0 ? "+" : ""}${r.toFixed(2)}R`]);
  if (trade.strategy) rows.push(["Setup", trade.strategy]);

  return (
    <div
      className={cn(
        "pointer-events-none absolute top-full z-20 mt-2 w-60 rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-lg",
        align
      )}
      style={{ left: `calc(0.75rem + (100% - 1.5rem) * ${position})` }}
      role="tooltip"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{trade.ticker}</p>
          <p className="text-[11px] text-muted-foreground">
            {trade.direction}
            {exitTime > 0 ? ` · ${format(exitTime, "d MMM yyyy")}` : ""}
          </p>
        </div>
        <div className="text-right">
          <p
            className={cn(
              "text-sm font-semibold",
              NUMERIC_CLASS,
              win && "text-emerald-600 dark:text-emerald-400",
              loss && "text-rose-600 dark:text-rose-400"
            )}
          >
            {formatMoney(trade.pnl, true, currency)}
          </p>
          {Number.isFinite(trade.roi) && trade.roi !== 0 ? (
            <p className={cn("text-[11px] text-muted-foreground", NUMERIC_CLASS)}>
              {trade.roi > 0 ? "+" : ""}
              {trade.roi.toFixed(2)}%
            </p>
          ) : null}
        </div>
      </div>
      <dl className="mt-2.5 space-y-1 border-t border-border/70 pt-2.5 text-[11px]">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className={cn("truncate text-right font-medium", NUMERIC_CLASS)}>
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function formatPrice(value: number, currency: CurrencyCode): string {
  if (!Number.isFinite(value) || value <= 0) return "—";
  return formatMoney(value, false, currency);
}

const TONE_DOT: Record<Tone, string> = {
  good: "bg-emerald-500",
  bad: "bg-rose-500",
  neutral: "bg-muted-foreground/50",
};

const TONE_TEXT: Record<Tone, string> = {
  good: "text-emerald-600 dark:text-emerald-400",
  bad: "text-rose-600 dark:text-rose-400",
  neutral: "text-foreground",
};

function InsightRow({ insight }: { insight: Insight }) {
  return (
    <li className="flex gap-3 py-3 first:pt-0 last:pb-0">
      <span
        className={cn("mt-1.5 size-2 shrink-0 rounded-full", TONE_DOT[insight.tone])}
        aria-hidden
      />
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
          {insight.label}
        </p>
        <p
          className={cn(
            "mt-0.5 text-sm font-semibold",
            NUMERIC_CLASS,
            TONE_TEXT[insight.tone]
          )}
        >
          {insight.headline}
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          {insight.detail}
        </p>
      </div>
    </li>
  );
}

export function EdgePanel({ trades, currency }: EdgePanelProps) {
  const edge = useMemo(() => computeEdge(trades, currency), [trades, currency]);

  const streakText =
    edge.streak > 0
      ? `Current streak: ${edge.streak} ${edge.streakSign > 0 ? "win" : "loss"}${edge.streak === 1 ? "" : edge.streakSign > 0 ? "s" : "es"} in a row.`
      : undefined;

  return (
    <DataPanel
      title="Where your edge leaks"
      subtitle="Your trade tape and the habits moving your P&L"
      meta={`${edge.decided} trades`}
      footer={streakText}
    >
      {edge.decided === 0 ? (
        <PanelEmpty
          title="No wins or losses yet"
          hint="Close trades with a profit or loss to see your trade tape and edge insights."
        />
      ) : (
        <div className="space-y-4">
          <TradeTape trades={edge.tape} currency={currency} />
          {edge.insights.length > 0 ? (
            <ul className="divide-y divide-border/60">
              {edge.insights.map((insight) => (
                <InsightRow key={insight.key} insight={insight} />
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">
              Log a few more wins and losses to unlock insights.
            </p>
          )}
        </div>
      )}
    </DataPanel>
  );
}
