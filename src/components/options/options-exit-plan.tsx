"use client";

import { useMemo, useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import { Minus, Plus, RotateCcw } from "lucide-react";
import type { ExitPlan, ExitPlanSettings } from "@/lib/options-exit-plan";
import { quoteSpread, stopSpotsAt } from "@/lib/options-exit-plan";
import { NumericInput } from "@/components/ui/numeric-input";
import { cn, NUMERIC_CLASS } from "@/lib/utils";

const labelClass =
  "text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground";

const thumbClass = cn(
  "[&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full",
  "[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background [&::-webkit-slider-thumb]:bg-foreground",
  "[&::-webkit-slider-thumb]:shadow-[0_0_0_1px_var(--color-border),0_2px_6px_rgba(0,0,0,0.35)]",
  "[&::-webkit-slider-thumb]:transition-transform hover:[&::-webkit-slider-thumb]:scale-110",
  "[&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2",
  "[&::-moz-range-thumb]:border-background [&::-moz-range-thumb]:bg-foreground"
);

function formatPlanPrice(value: number) {
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatSpot(value: number) {
  return value.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function rupees(plan: ExitPlan, perShare: number, currency: string) {
  if (!plan.multiplier) return null;
  const total = Math.round(perShare * plan.multiplier * plan.contracts);
  const sign = total > 0 ? "+" : total < 0 ? "−" : "";
  return `${sign}${currency} ${Math.abs(total).toLocaleString("en-IN")}`;
}

function pct(value: number, min: number, max: number) {
  if (max <= min) return 0;
  return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
}

function InlineNumberInput({
  value,
  display,
  onCommit,
  ariaLabel,
  allowNegative = false,
  className,
}: {
  value: number;
  display: string;
  onCommit: (next: number) => void;
  ariaLabel: string;
  allowNegative?: boolean;
  className?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const [blank, setBlank] = useState(false);
  const [tracked, setTracked] = useState(display);
  if (tracked !== display) {
    setTracked(display);
    setBlank(false);
    setDraft(null);
  }

  const commit = () => {
    if (draft == null) return;
    const trimmed = draft
      .replace(/[,%+\s]/g, "")
      .replace(/−/g, "-")
      .replace(/^\+/, "");
    if (!trimmed || trimmed === "-" || trimmed === ".") {
      setDraft(null);
      setBlank(true);
      return;
    }
    const next = Number(trimmed);
    if (Number.isFinite(next) && (allowNegative || next > 0)) onCommit(next);
    setBlank(false);
    setDraft(null);
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      aria-label={ariaLabel}
      value={blank ? "" : (draft ?? display)}
      onFocus={(event) => {
        setBlank(false);
        setDraft(String(Math.round(value * 100) / 100));
        const input = event.currentTarget;
        requestAnimationFrame(() => input.select());
      }}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        } else if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          const input = event.currentTarget;
          setDraft(null);
          requestAnimationFrame(() => input.blur());
        }
      }}
      className={cn(
        "bg-transparent text-center text-xs font-medium outline-none focus:bg-muted/40",
        NUMERIC_CLASS,
        className
      )}
    />
  );
}

function Track({
  value,
  min,
  max,
  step,
  onChange,
  fillFrom,
  fillClass,
  markers = [],
  ariaLabel,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (next: number) => void;
  fillFrom: number;
  fillClass: string;
  markers?: { at: number; label: string; className: string }[];
  ariaLabel: string;
}) {
  const valuePct = pct(value, min, max);
  const fromPct = pct(fillFrom, min, max);
  const left = Math.min(valuePct, fromPct);
  const width = Math.abs(valuePct - fromPct);

  return (
    <div className="relative h-8">
      <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-muted" />
      <div
        className={cn(
          "absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full",
          fillClass
        )}
        style={{ left: `${left}%`, width: `${width}%` }}
      />
      {markers.map((marker) => (
        <div
          key={marker.label}
          className="pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${pct(marker.at, min, max)}%` }}
        >
          <div className={cn("h-3.5 w-0.5 rounded-full", marker.className)} />
        </div>
      ))}
      <input
        type="range"
        aria-label={ariaLabel}
        min={min}
        max={max}
        step={step}
        value={Math.min(max, Math.max(min, value))}
        onChange={(event) => onChange(Number(event.target.value))}
        className={cn(
          "absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent",
          thumbClass
        )}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative";
}) {
  return (
    <div className="min-w-0 px-4 py-3">
      <p className={labelClass}>{label}</p>
      <p
        className={cn(
          "mt-1 truncate text-sm font-semibold text-foreground",
          NUMERIC_CLASS,
          tone === "positive" && "text-emerald-600 dark:text-emerald-400",
          tone === "negative" && "text-rose-600 dark:text-rose-400"
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function OptionsExitPlan({
  plan,
  settings,
  onSettingsChange,
  spot,
  onSpotChange,
  isCredit,
  currency,
  underlying,
}: {
  plan: ExitPlan | null;
  settings: ExitPlanSettings;
  onSettingsChange: (next: ExitPlanSettings) => void;
  spot: number | undefined;
  onSpotChange: (next: number | undefined) => void;
  isCredit: boolean;
  currency: string;
  underlying?: string;
}) {
  const symbol = underlying?.trim() || "Spot";
  const [target, setTarget] = useState<number | null>(null);
  const [dayOffset, setDayOffset] = useState(0);
  const planKey = plan ? `${plan.spot}|${plan.asOf}|${plan.expiry}` : "";
  const [seenPlanKey, setSeenPlanKey] = useState(planKey);
  if (seenPlanKey !== planKey) {
    setSeenPlanKey(planKey);
    setTarget(null);
    setDayOffset(0);
  }

  const scenario = useMemo(() => {
    if (!plan) return null;
    const asOf = parseISO(plan.asOf);
    const days = Math.min(plan.daysLeft, Math.max(0, dayOffset));
    const when = addDays(asOf, days);
    when.setHours(15, 30, 0, 0);
    const price = target ?? plan.spot;
    const quote = quoteSpread(plan, price, when);
    const movePct = ((price - plan.spot) / plan.spot) * 100;
    const pastStop =
      plan.kind === "credit"
        ? quote.exitPrice >= plan.premiumStop - 0.005
        : quote.exitPrice <= plan.premiumStop + 0.005;
    const exitSpots = stopSpotsAt(plan, plan.spot, when);
    return { price, when, daysLeft: plan.daysLeft - days, movePct, quote, pastStop, exitSpots };
  }, [plan, target, dayOffset]);

  if (!plan || !scenario) {
    return (
      <div className="rounded-xl border border-border bg-card px-4 py-4">
        <p className={labelClass}>Exit plan</p>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {spot
            ? "Enter strike, expiry and entry premium on every leg."
            : "Enter the stock price to see when to exit."}
        </p>
        {!spot ? (
          <input
            type="number"
            min={0}
            step="any"
            placeholder="Spot price"
            className={cn(
              "mt-3 h-8 w-32 rounded-md border border-border bg-background px-2.5 text-sm",
              NUMERIC_CLASS
            )}
            onChange={(event) =>
              onSpotChange(
                event.target.value ? Number(event.target.value) : undefined
              )
            }
          />
        ) : null}
      </div>
    );
  }

  const minSpot = plan.spot * 0.8;
  const maxSpot = plan.spot * 1.2;
  const spotStep = Math.max(0.05, (maxSpot - minSpot) / 200);
  const nudge = spotStep * 8;
  const moveLabel =
    Math.abs(scenario.movePct) < 0.05
      ? "stays at"
      : scenario.movePct < 0
        ? `falls ${Math.abs(scenario.movePct).toFixed(1)}% to`
        : `rises ${scenario.movePct.toFixed(1)}% to`;
  const pnl = scenario.quote.pnl;
  const pnlText =
    rupees(plan, pnl, currency) ??
    `${pnl >= 0 ? "+" : "−"}${formatPlanPrice(Math.abs(pnl))}/sh`;
  const todayStop = plan.checkpoints[0];
  const stopLevels = [todayStop?.below, todayStop?.above].filter(
    (level): level is number => level != null
  );
  const { exitSpots } = scenario;
  const exitLevels = exitSpots.breached
    ? []
    : (["below", "above"] as const).flatMap((side) => {
        const price = exitSpots[side];
        return price == null ? [] : [{ side, price }];
      });
  const moved = target != null && Math.abs(scenario.price - plan.spot) > 1e-6;
  const fillClass =
    scenario.movePct < 0 ? "bg-rose-500/70" : "bg-emerald-500/70";

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <p className={labelClass}>Exit plan</p>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1",
              scenario.pastStop
                ? "bg-rose-500/10 text-rose-700 ring-rose-500/25 dark:text-rose-300"
                : "bg-emerald-500/10 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300"
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                scenario.pastStop ? "bg-rose-500" : "bg-emerald-500"
              )}
            />
            {scenario.pastStop ? "Past stop" : "Inside stop"}
          </span>
        </div>
        <label className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
          Stop at
          <NumericInput
            value={isCredit ? settings.lossMultiple : settings.debitStopPct}
            onValueChange={(value) => {
              if (value == null || value <= 0) return;
              onSettingsChange(
                isCredit
                  ? { ...settings, lossMultiple: value }
                  : { ...settings, debitStopPct: value }
              );
            }}
            aria-label={isCredit ? "Loss multiple" : "Debit stop percent"}
            className={cn(
              "h-6 w-11 rounded-md border border-border bg-background px-1.5 text-center text-xs text-foreground",
              NUMERIC_CLASS
            )}
          />
          {isCredit ? "× credit" : "% of debit"}
        </label>
      </header>

      <div className="grid gap-4 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          If <span className="font-medium text-foreground">{symbol}</span>{" "}
          {moveLabel}{" "}
          <span className={cn("font-semibold text-foreground", NUMERIC_CLASS)}>
            {formatSpot(scenario.price)}
          </span>{" "}
          by{" "}
          <span className="font-semibold text-foreground">
            {format(scenario.when, "EEE, d MMM")}
          </span>{" "}
          <span className="text-muted-foreground/70">
            · {scenario.daysLeft}d to expiry
          </span>
        </p>
        <div className="sm:text-right">
          <p className={labelClass}>Exit if {symbol}</p>
          {exitSpots.breached ? (
            <p className="mt-0.5 text-3xl font-semibold tracking-tight text-rose-600 dark:text-rose-400">
              Exit now
            </p>
          ) : exitLevels.length ? (
            <div className="mt-0.5 flex flex-wrap items-baseline gap-x-3 sm:justify-end">
              {exitLevels.map((level) => (
                <p
                  key={level.side}
                  className={cn(
                    "text-3xl font-semibold tracking-tight text-rose-600 dark:text-rose-400",
                    NUMERIC_CLASS
                  )}
                >
                  <span className="mr-1 text-lg text-muted-foreground">
                    {level.side === "below" ? "<" : ">"}
                  </span>
                  {formatSpot(level.price)}
                </p>
              ))}
            </div>
          ) : (
            <p className="mt-0.5 text-3xl font-semibold tracking-tight text-muted-foreground">—</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 divide-x divide-border border-y border-border bg-muted/20">
        <Stat
          label="P&L at exit"
          value={pnlText}
          tone={pnl >= 0 ? "positive" : "negative"}
        />
        <Stat
          label="Spread price"
          value={formatPlanPrice(scenario.quote.exitPrice)}
          tone={scenario.pastStop ? "negative" : undefined}
        />
        <Stat
          label="Stop price"
          value={formatPlanPrice(plan.premiumStop)}
          tone="negative"
        />
      </div>

      {plan.stopBeyondMaxLoss ? (
        <p className="border-b border-border bg-amber-500/5 px-4 py-2 text-xs text-amber-700 dark:text-amber-300">
          This stop is beyond the spread&apos;s max loss, so it never triggers.
          Lower the multiple.
        </p>
      ) : null}

      <div className="grid gap-x-8 gap-y-5 px-4 py-4 sm:grid-cols-2">
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-foreground">
              {symbol} price
            </span>
            <div className="flex items-center gap-1">
              <InlineNumberInput
                ariaLabel={`${symbol} move percent`}
                allowNegative
                value={Math.round(scenario.movePct * 100) / 100}
                display={`${scenario.movePct > 0 ? "+" : ""}${scenario.movePct.toFixed(1)}%`}
                onCommit={(next) => {
                  const price = plan.spot * (1 + next / 100);
                  if (price > 0) setTarget(price);
                }}
                className={cn(
                  "mr-1 h-6 w-14 rounded-md border border-transparent text-[11px] hover:border-border focus:border-border",
                  scenario.movePct < 0
                    ? "text-rose-600 dark:text-rose-400"
                    : scenario.movePct > 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-muted-foreground"
                )}
              />
              <div className="inline-flex items-center rounded-md border border-border bg-background">
                <button
                  type="button"
                  aria-label="Lower price"
                  className="px-1.5 py-1 text-muted-foreground hover:text-foreground"
                  onClick={() =>
                    setTarget(Math.max(minSpot, scenario.price - nudge))
                  }
                >
                  <Minus className="size-3" />
                </button>
                <InlineNumberInput
                  ariaLabel={`${symbol} target price`}
                  value={scenario.price}
                  display={formatSpot(scenario.price)}
                  onCommit={setTarget}
                  className="h-6 w-20 border-x border-border px-2 text-foreground"
                />
                <button
                  type="button"
                  aria-label="Raise price"
                  className="px-1.5 py-1 text-muted-foreground hover:text-foreground"
                  onClick={() =>
                    setTarget(Math.min(maxSpot, scenario.price + nudge))
                  }
                >
                  <Plus className="size-3" />
                </button>
              </div>
              <button
                type="button"
                aria-label="Reset price"
                disabled={!moved}
                className="ml-0.5 rounded-md p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                onClick={() => setTarget(null)}
              >
                <RotateCcw className="size-3.5" />
              </button>
            </div>
          </div>
          <Track
            ariaLabel={`${symbol} price`}
            min={minSpot}
            max={maxSpot}
            step={spotStep}
            value={scenario.price}
            onChange={setTarget}
            fillFrom={plan.spot}
            fillClass={fillClass}
            markers={[
              { at: plan.spot, label: "spot", className: "bg-muted-foreground/60" },
              ...stopLevels.map((level) => ({
                at: level,
                label: `stop-${level}`,
                className: "bg-rose-500",
              })),
            ]}
          />
          <div
            className={cn(
              "flex justify-between text-[10px] text-muted-foreground",
              NUMERIC_CLASS
            )}
          >
            <span>{formatSpot(minSpot)}</span>
            {stopLevels.length ? (
              <span className="text-rose-600/80 dark:text-rose-400/80">
                ▍stop {stopLevels.map(formatSpot).join(" / ")}
              </span>
            ) : null}
            <span>{formatSpot(maxSpot)}</span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-foreground">Date</span>
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-muted-foreground">
                {format(scenario.when, "EEE, d MMM")} ·{" "}
                <span className={NUMERIC_CLASS}>{scenario.daysLeft}d</span> left
              </span>
              <button
                type="button"
                aria-label="Reset date"
                disabled={dayOffset === 0}
                className="ml-0.5 rounded-md p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                onClick={() => setDayOffset(0)}
              >
                <RotateCcw className="size-3.5" />
              </button>
            </div>
          </div>
          <Track
            ariaLabel="Days forward"
            min={0}
            max={Math.max(plan.daysLeft, 1)}
            step={1}
            value={Math.min(plan.daysLeft, dayOffset)}
            onChange={setDayOffset}
            fillFrom={0}
            fillClass="bg-sky-500/70"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Today · {format(parseISO(plan.asOf), "d MMM")}</span>
            <span>Expiry · {format(parseISO(plan.expiry), "d MMM")}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
