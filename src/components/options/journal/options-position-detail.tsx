import type { ReactNode } from "react";
import { format, parseISO } from "date-fns";
import { OptionsPayoffSummary } from "@/components/options/options-payoff-summary";
import type { OptionsPositionView } from "@/lib/options-journal";
import { formatMarketPrice } from "@/lib/journal-types";
import { hasPayoffMetrics } from "@/lib/options-trade-meta";
import { sharesPerOptionLot } from "@/lib/nse-fo-lot-size";
import type { CurrencyCode } from "@/lib/settings";
import { cn, NUMERIC_CLASS } from "@/lib/utils";

const labelClass =
  "text-[11px] font-medium tracking-wide text-muted-foreground";

function formatShortDate(value: string | null | undefined) {
  if (!value) return "—";
  try {
    return format(parseISO(value), "d MMM yy");
  } catch {
    return value;
  }
}

function Tile({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "positive" | "negative";
}) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-md px-2.5 py-2",
        tone === "positive"
          ? "bg-emerald-500/10"
          : tone === "negative"
            ? "bg-rose-500/10"
            : "bg-muted/50"
      )}
    >
      <p className={labelClass}>{label}</p>
      <p
        className={cn(
          "mt-0.5 truncate text-sm font-semibold",
          NUMERIC_CLASS,
          tone === "positive"
            ? "text-emerald-700 dark:text-emerald-400"
            : tone === "negative"
              ? "text-rose-700 dark:text-rose-400"
              : value === "—"
                ? "text-muted-foreground/60"
                : "text-foreground"
        )}
      >
        {value}
      </p>
    </div>
  );
}

function ordinal(day: number) {
  const mod100 = day % 100;
  if (mod100 >= 11 && mod100 <= 13) return "th";
  return ["th", "st", "nd", "rd"][day % 10] ?? "th";
}

function formatQty(value: number) {
  return value.toLocaleString("en-IN");
}

function formatAvg(value: number) {
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPnl(value: number) {
  const rounded = Math.round(value);
  if (rounded === 0) return "0";
  return `${rounded > 0 ? "+" : "-"}${Math.abs(rounded).toLocaleString("en-IN")}`;
}

function pnlClass(value: number | null) {
  if (value == null || Math.round(value) === 0) return "text-foreground";
  return value > 0
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-rose-600 dark:text-rose-400";
}

const TH =
  "px-3 py-2.5 text-xs font-normal text-muted-foreground whitespace-nowrap";
const TD = cn("px-3 py-3 text-sm whitespace-nowrap", NUMERIC_CLASS);

function LegsTable({
  position,
  sharesPerLot,
  net,
  money,
}: {
  position: OptionsPositionView;
  sharesPerLot: number;
  net: number | null;
  money: (value: number) => string;
}) {
  const closed = position.status !== "Open";
  const rows = position.legs.map((leg) => {
    const short = leg.side === "Short";
    const shares = leg.quantity * (leg.type === "Stock" ? 1 : sharesPerLot);
    const pnl =
      leg.exitPremium != null
        ? (leg.exitPremium - leg.premium) * shares * (short ? -1 : 1)
        : null;
    return { leg, short, shares, pnl };
  });
  const total = rows.every((row) => row.pnl != null)
    ? rows.reduce((sum, row) => sum + (row.pnl ?? 0), 0)
    : null;

  const instrument = (leg: OptionsPositionView["legs"][number]) => {
    if (leg.type === "Stock") return <span>{position.underlying}</span>;
    let day: ReactNode = null;
    if (leg.expiry) {
      try {
        const date = parseISO(leg.expiry);
        const d = date.getDate();
        day = (
          <>
            {d}
            <sup className="text-[0.65em]">{ordinal(d)}</sup>{" "}
            {format(date, "MMM")}{" "}
          </>
        );
      } catch {
        day = null;
      }
    }
    return (
      <span>
        {day}
        {leg.strike ?? "—"} {leg.type === "Call" ? "CE" : "PE"}
      </span>
    );
  };

  return (
    <div className="overflow-hidden rounded-md border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] border-collapse text-left">
          <thead className="border-b border-border">
            <tr>
              <th className={TH}>Instrument</th>
              <th className={cn(TH, "text-right")}>Qty</th>
              <th className={cn(TH, "text-right")}>Avg</th>
              <th className={cn(TH, "text-right")}>LTP</th>
              <th className={cn(TH, "text-right")}>Total P&L</th>
              <th className={cn(TH, "text-right")}>Unbooked</th>
              <th className={cn(TH, "text-right")}>Booked</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ leg, short, shares, pnl }) => (
              <tr
                key={leg.id}
                className="border-b border-border/60 last:border-b-0 hover:bg-muted/20"
              >
                <td className={cn(TD, "font-sans")}>
                  <div className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        "inline-flex size-5 items-center justify-center rounded text-[10px] font-semibold",
                        short
                          ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                          : "bg-sky-500/15 text-sky-600 dark:text-sky-400"
                      )}
                    >
                      {short ? "S" : "B"}
                    </span>
                    <span className="text-foreground">{instrument(leg)}</span>
                  </div>
                </td>
                <td className={cn(TD, "text-right text-foreground")}>
                  {formatQty(short ? -shares : shares)}
                </td>
                <td className={cn(TD, "text-right text-foreground")}>
                  {formatAvg(leg.premium)}
                </td>
                <td className={cn(TD, "text-right text-foreground")}>
                  {leg.exitPremium != null ? formatAvg(leg.exitPremium) : "—"}
                </td>
                <td className={cn(TD, "text-right", pnlClass(pnl))}>
                  {pnl != null ? formatPnl(pnl) : "—"}
                </td>
                <td
                  className={cn(TD, "text-right", pnlClass(closed ? 0 : pnl))}
                >
                  {pnl == null ? "—" : closed ? "0" : formatPnl(pnl)}
                </td>
                <td
                  className={cn(TD, "text-right", pnlClass(closed ? pnl : 0))}
                >
                  {pnl == null ? "—" : closed ? formatPnl(pnl) : "0"}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-border bg-muted/20">
            <tr>
              <td className={cn(TD, "font-sans text-xs text-muted-foreground")}>
                {net != null
                  ? `Net ${net >= 0 ? "credit" : "debit"} ${money(Math.abs(net))}`
                  : null}
              </td>
              <td colSpan={3} />
              <td className={cn(TD, "text-right font-semibold", pnlClass(total))}>
                {total != null ? formatPnl(total) : "—"}
              </td>
              <td
                className={cn(
                  TD,
                  "text-right font-semibold",
                  pnlClass(closed ? 0 : total)
                )}
              >
                {total == null ? "—" : closed ? "0" : formatPnl(total)}
              </td>
              <td
                className={cn(
                  TD,
                  "text-right font-semibold",
                  pnlClass(closed ? total : 0)
                )}
              >
                {total == null ? "—" : closed ? formatPnl(total) : "0"}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export function OptionsPositionDetail({
  position,
  currency,
}: {
  position: OptionsPositionView;
  currency: CurrencyCode;
}) {
  const meta = position.source.optionsMeta;
  const plan = meta?.exitPlan;
  const money = (value: number) => formatMarketPrice(value, currency);
  const sharesPerLot = meta
    ? sharesPerOptionLot(
        position.underlying,
        position.source.listingMarket ?? "IN_NSE"
      ) || 1
    : 1;

  const optionLegs = position.legs.filter((leg) => leg.type !== "Stock");
  const net = optionLegs.reduce(
    (sum, leg) =>
      sum + (leg.side === "Short" ? 1 : -1) * leg.premium * leg.quantity,
    0
  );

  const stockStop = [
    plan?.underlyingStopBelow != null
      ? `< ${plan.underlyingStopBelow.toLocaleString("en-IN")}`
      : null,
    plan?.underlyingStopAbove != null
      ? `> ${plan.underlyingStopAbove.toLocaleString("en-IN")}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-3">
        <LegsTable
          position={position}
          sharesPerLot={sharesPerLot}
          net={optionLegs.length ? net : null}
          money={money}
        />

        {hasPayoffMetrics(meta?.payoff) ? (
          <OptionsPayoffSummary payoff={meta.payoff} />
        ) : null}
      </div>

      <div className="min-w-0 space-y-3">
        <div className="space-y-2 rounded-md border border-border p-3">
          <p className={labelClass}>Risk & Plan</p>
          <div className="grid grid-cols-2 gap-2">
            <Tile
              label="Max Risk"
              value={
                position.maxRisk != null ? money(position.maxRisk) : "—"
              }
              tone={position.maxRisk != null ? "negative" : "neutral"}
            />
            <Tile label="Fees" value={money(position.fees)} />
            <Tile
              label="Spot At Entry"
              value={
                meta?.spotAtEntry != null
                  ? meta.spotAtEntry.toLocaleString("en-IN")
                  : "—"
              }
            />
            <Tile label="Expiry" value={formatShortDate(position.expiry)} />
            {plan ? (
              <>
                <Tile
                  label="Profit Target"
                  value={money(plan.profitTargetPrice)}
                  tone="positive"
                />
                <Tile label="Stock Stop" value={stockStop || "—"} />
              </>
            ) : null}
          </div>
        </div>

        {position.tags.length || position.notes ? (
          <div className="space-y-2.5 rounded-md border border-border p-3">
            {position.tags.length ? (
              <div className="flex flex-wrap gap-1.5">
                {position.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] text-foreground/80"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
            {position.notes ? (
              <div>
                <p className={labelClass}>Notes</p>
                <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-foreground/90">
                  {position.notes}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
