import type { OptionsPayoffMetrics } from "@/lib/options-trade-meta";
import { cn, NUMERIC_CLASS } from "@/lib/utils";

const labelClass =
  "text-[11px] font-medium tracking-wide text-muted-foreground";

function formatAmount(value: number) {
  return Math.round(value).toLocaleString("en-IN");
}

function formatSignedAmount(value: number) {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${formatAmount(Math.abs(value))}`;
}

function formatPct(value: number) {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded > 0 ? "+" : rounded < 0 ? "−" : ""}${Math.abs(rounded)}%`;
}

type Tone = "positive" | "negative" | "neutral";

const toneClass: Record<Tone, { tile: string; value: string }> = {
  positive: {
    tile: "bg-emerald-500/10",
    value: "text-emerald-700 dark:text-emerald-400",
  },
  negative: {
    tile: "bg-rose-500/10",
    value: "text-rose-700 dark:text-rose-400",
  },
  neutral: {
    tile: "bg-muted/50",
    value: "text-foreground",
  },
};

function StatTile({
  label,
  value,
  detail,
  tone = "neutral",
}: {
  label: string;
  value?: string;
  detail?: string;
  tone?: Tone;
}) {
  return (
    <div className={cn("min-w-0 rounded-md px-2.5 py-2", toneClass[tone].tile)}>
      <p className={labelClass}>{label}</p>
      <p
        className={cn(
          "mt-0.5 truncate text-sm font-semibold",
          NUMERIC_CLASS,
          value ? toneClass[tone].value : "text-muted-foreground/60"
        )}
      >
        {value ?? "—"}
        {value && detail ? (
          <span className="ml-1 text-[11px] font-medium opacity-80">
            ({detail})
          </span>
        ) : null}
      </p>
    </div>
  );
}

export function OptionsPayoffSummary({
  payoff,
}: {
  payoff: OptionsPayoffMetrics;
}) {
  const maxProfit = payoff.maxProfitUnlimited
    ? "Unlimited"
    : payoff.maxProfit != null
      ? formatSignedAmount(Math.abs(payoff.maxProfit))
      : undefined;
  const maxLoss = payoff.maxLossUnlimited
    ? "Unlimited"
    : payoff.maxLoss != null
      ? formatSignedAmount(-Math.abs(payoff.maxLoss))
      : undefined;
  const breakevens = payoff.breakevens?.length
    ? payoff.breakevens.map((value) => formatAmount(value)).join(" / ")
    : undefined;

  return (
    <div className="space-y-2 rounded-md border border-border p-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile
          label="Max Profit"
          tone="positive"
          value={maxProfit}
          detail={
            payoff.maxProfitPct != null && !payoff.maxProfitUnlimited
              ? formatPct(Math.abs(payoff.maxProfitPct))
              : undefined
          }
        />
        <StatTile
          label="Max Loss"
          tone="negative"
          value={maxLoss}
          detail={
            payoff.maxLossPct != null && !payoff.maxLossUnlimited
              ? formatPct(-Math.abs(payoff.maxLossPct))
              : undefined
          }
        />
        <StatTile
          label="Breakeven"
          value={breakevens}
          detail={
            payoff.breakevenPct != null
              ? formatPct(payoff.breakevenPct)
              : undefined
          }
        />
        <StatTile
          label="POP"
          value={payoff.pop != null ? `${Math.round(payoff.pop)}%` : undefined}
        />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <StatTile
          label="Risk / Reward"
          value={
            payoff.riskReward != null
              ? `1 : ${Math.round(payoff.riskReward * 100) / 100}`
              : undefined
          }
        />
        <StatTile
          label="Funds Needed"
          value={
            payoff.fundsNeeded != null
              ? formatAmount(payoff.fundsNeeded)
              : undefined
          }
        />
        <StatTile
          label="Margin Needed"
          value={
            payoff.marginNeeded != null
              ? formatAmount(payoff.marginNeeded)
              : undefined
          }
        />
      </div>
    </div>
  );
}
