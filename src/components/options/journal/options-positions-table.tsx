"use client";

import { Fragment, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import {
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
} from "lucide-react";
import { OptionsPositionDetail } from "@/components/options/journal/options-position-detail";
import { PositionProfit } from "@/components/options/journal/book-profit";
import { OptionsTargetStopCell } from "@/components/options/journal/options-target-stop-cell";
import { strategyCategoryMeta } from "@/components/options/journal/options-strategy-badge";
import { PanelEmpty } from "@/components/data-panel";
import { Button } from "@/components/ui/button";
import {
  AnimatedCurrency,
  AnimatedPercent,
} from "@/components/ui/animated-number";
import type { OptionsPositionView } from "@/lib/options-journal";
import type { CurrencyCode } from "@/lib/settings";
import { APP_CARD_SURFACE_CLASS } from "@/lib/app-shell";
import { cn, NUMERIC_CLASS } from "@/lib/utils";

const TH =
  "px-3 py-2.5 text-[11px] font-semibold tracking-wide text-muted-foreground";
const TD = "px-3 py-3 align-middle text-sm";

function StrategyCell({
  label,
  category,
}: {
  label: string;
  category: OptionsPositionView["strategyCategory"];
}) {
  const meta = strategyCategoryMeta(category);
  const showFamily = meta.label !== label;
  return (
    <div className="flex min-w-0 max-w-[12rem] items-center gap-2.5">
      <span className={cn("h-7 w-0.5 shrink-0 rounded-full", meta.accent)} />
      <div className="min-w-0">
        <p className="truncate font-medium leading-tight text-foreground">{label}</p>
        {showFamily ? (
          <p className="mt-0.5 truncate text-[11px] leading-tight text-muted-foreground">
            {meta.label}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function statusPill(status: OptionsPositionView["status"]) {
  if (status === "Open") {
    return "border-primary/30 bg-primary/10 text-primary";
  }
  if (status === "Assigned") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200";
  }
  return "border-border bg-muted/50 text-muted-foreground";
}

type OptionsPositionsTableProps = {
  title: string;
  subtitle: string;
  positions: OptionsPositionView[];
  currency: CurrencyCode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  onEdit?: (position: OptionsPositionView) => void;
  onDelete?: (id: string) => void;
};

export function OptionsPositionsTable({
  title,
  subtitle,
  positions,
  currency,
  collapsible = false,
  defaultOpen = true,
  onEdit,
  onDelete,
}: OptionsPositionsTableProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sorted = useMemo(
    () =>
      [...positions].sort(
        (a, b) =>
          parseISO(b.entryDate).getTime() - parseISO(a.entryDate).getTime()
      ),
    [positions]
  );

  const sectionOpen = !collapsible || open;

  return (
    <section className={cn(APP_CARD_SURFACE_CLASS, "min-w-0")}>
      <header
        className={cn(
          "flex flex-wrap items-start justify-between gap-3 px-4 py-3 sm:px-5",
          sectionOpen && "border-b border-border"
        )}
      >
        {collapsible ? (
          <button
            type="button"
            className="flex min-w-0 flex-1 items-start gap-2 text-left"
            onClick={() => setOpen((v) => !v)}
          >
            <ChevronRight
              className={cn(
                "mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform",
                open && "rotate-90"
              )}
            />
            <div className="min-w-0">
              <h3 className="text-sm font-semibold tracking-tight text-foreground">
                {title}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  ({positions.length})
                </span>
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
            </div>
          </button>
        ) : (
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold tracking-tight text-foreground">
              {title}
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                ({positions.length})
              </span>
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
          </div>
        )}
      </header>

      {!sectionOpen ? null : sorted.length === 0 ? (
        <div className="p-4 sm:p-5">
          <PanelEmpty
            title={`No ${title.toLowerCase()}`}
            hint="Adjust filters or log a new options position to populate this section."
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[64rem] border-collapse text-left">
            <thead className="border-b border-border bg-muted/20">
              <tr>
                <th className={cn(TH, "w-8")} />
                <th className={TH}>Underlying</th>
                <th className={TH}>Strategy</th>
                <th className={cn(TH, "text-center")}>Status</th>
                <th className={cn(TH, "text-center")}>Entry</th>
                <th className={cn(TH, "text-center")}>DTE</th>
                <th className={cn(TH, "text-right")}>Net Premium</th>
                <th className={cn(TH, "text-right")}>Profit</th>
                <th className={cn(TH, "text-right")}>ROI</th>
                <th className={cn(TH, "min-w-[9rem] text-center")}>
                  Target / Stop
                </th>
                <th className={cn(TH, "w-20 text-center")}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((position) => {
                const expanded = expandedId === position.id;
                return (
                  <Fragment key={position.id}>
                    <tr
                      className="cursor-pointer border-b border-border/60 transition-colors hover:bg-muted/15"
                      onClick={() =>
                        setExpandedId(expanded ? null : position.id)
                      }
                    >
                      <td className={TD}>
                        <button
                          type="button"
                          className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
                          onClick={(event) => {
                            event.stopPropagation();
                            setExpandedId(expanded ? null : position.id);
                          }}
                          aria-expanded={expanded}
                        >
                          <ChevronDown
                            className={cn(
                              "size-4 transition-transform",
                              !expanded && "-rotate-90"
                            )}
                          />
                        </button>
                      </td>
                      <td className={cn(TD, "font-semibold")}>
                        {position.underlying}
                      </td>
                      <td className={TD}>
                        <StrategyCell
                          label={position.strategyLabel}
                          category={position.strategyCategory}
                        />
                      </td>
                      <td className={cn(TD, "text-center")}>
                        <span
                          className={cn(
                            "inline-flex rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                            statusPill(position.status)
                          )}
                        >
                          {position.status}
                        </span>
                      </td>
                      <td
                        className={cn(
                          TD,
                          "text-center text-xs tabular-nums text-muted-foreground"
                        )}
                      >
                        {format(parseISO(position.entryDate), "MMM d, yyyy")}
                      </td>
                      <td className={cn(TD, "text-center", NUMERIC_CLASS)}>
                        {position.dte == null ? "—" : `${position.dte}d`}
                      </td>
                      <td className={cn(TD, "text-right", NUMERIC_CLASS)}>
                        <AnimatedCurrency
                          value={position.netPremium}
                          currency={currency}
                        />
                      </td>
                      <td className={cn(TD, "text-right font-medium")}>
                        <PositionProfit
                          position={position}
                          currency={currency}
                        />
                      </td>
                      <td className={cn(TD, "text-right", NUMERIC_CLASS)}>
                        <AnimatedPercent value={position.roi} decimals={1} />
                      </td>
                      <td className={cn(TD, "min-w-[9rem] px-2")}>
                        <OptionsTargetStopCell
                          position={position}
                          currency={currency}
                        />
                      </td>
                      <td
                        className={cn(TD, "text-center")}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <div className="inline-flex gap-0.5">
                          {onEdit ? (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="size-8"
                              onClick={() => onEdit(position)}
                              aria-label="Edit position"
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                          ) : null}
                          {onDelete ? (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="size-8 text-muted-foreground hover:text-destructive"
                              onClick={() => onDelete(position.id)}
                              aria-label="Delete position"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                    {expanded ? (
                      <tr className="border-b border-border/60 bg-muted/10">
                        <td colSpan={11} className="px-4 py-4 sm:px-5">
                          <OptionsPositionDetail
                            position={position}
                            currency={currency}
                          />
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
