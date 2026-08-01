"use client";

import { format } from "date-fns";
import { ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  displayTradeOutcome,
  formatCurrency,
  formatHoldTime,
  formatMarketPrice,
  isClosedTrade,
  type JournalTrade,
} from "@/lib/journal-types";
import { useSettings } from "@/components/settings/settings-provider";
import { ShareTradeButton } from "@/components/journal/share-trade-dialog";
import { ChartScreenshotPreview } from "@/components/journal/chart-screenshot-preview";
import {
  tradeBadgeNegative,
  tradeBadgeNeutral,
  tradeBadgePositive,
  NUMERIC_CLASS,
  cn,
} from "@/lib/utils";

interface TradeDetailDrawerProps {
  trade: JournalTrade | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TradeDetailDrawer({
  trade,
  open,
  onOpenChange,
}: TradeDetailDrawerProps) {
  const { settings } = useSettings();
  const currency = settings.profile.currency;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full border-border bg-background p-0 sm:max-w-xl"
      >
        {trade ? (
          <ScrollArea className="h-full">
            <div className="space-y-6 p-6">
              <SheetHeader className="space-y-3 text-left">
                <div className="flex flex-wrap items-center gap-2">
                  <SheetTitle className="font-mono text-2xl">
                    {trade.ticker}
                  </SheetTitle>
                  <Badge
                    variant="outline"
                    className={
                      (trade.status ?? "Closed") === "Active"
                        ? "border-border bg-muted/40 text-muted-foreground"
                        : trade.outcome === "Win"
                        ? tradeBadgePositive
                        : trade.outcome === "Loss"
                          ? tradeBadgeNegative
                          : tradeBadgeNeutral
                    }
                  >
                    {displayTradeOutcome(trade)}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={
                      trade.direction === "Long"
                        ? tradeBadgePositive
                        : tradeBadgeNegative
                    }
                  >
                    {trade.direction}
                  </Badge>
                  <Badge variant="outline" className="border-border">
                    {trade.assetClass}
                  </Badge>
                  {isClosedTrade(trade) ? (
                    <ShareTradeButton trade={trade} />
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Net P&L</p>
                    <p
                      className={cn(
                        "font-semibold",
                        NUMERIC_CLASS,
                        trade.pnl >= 0 ? "text-emerald-500" : "text-rose-500"
                      )}
                    >
                      {formatCurrency(trade.pnl)} ({trade.roi >= 0 ? "+" : ""}
                      {trade.roi.toFixed(2)}%)
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">R:R</p>
                    <p className={cn("font-semibold", NUMERIC_CLASS)}>{trade.riskReward}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Hold</p>
                    <p className={cn("font-semibold", NUMERIC_CLASS)}>
                      {formatHoldTime(trade.holdTimeHours)}
                    </p>
                  </div>
                </div>
              </SheetHeader>

              <Separator />

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Execution Logs</h3>
                <div className="overflow-hidden rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Side</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Fees</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trade.executions.map((fill) => (
                        <TableRow key={fill.id}>
                          <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                            {format(new Date(fill.time), "MMM d HH:mm")}
                          </TableCell>
                          <TableCell className="text-xs">{fill.side}</TableCell>
                          <TableCell className={cn("text-xs", NUMERIC_CLASS)}>
                            {formatMarketPrice(fill.price, currency)}
                          </TableCell>
                          <TableCell className={cn("text-xs", NUMERIC_CLASS)}>
                            {fill.quantity}
                          </TableCell>
                          <TableCell className={cn("text-xs", NUMERIC_CLASS)}>
                            {formatMarketPrice(fill.fees, currency)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Risk Management</h3>
                <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-card p-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Stop Loss</p>
                    <p className={NUMERIC_CLASS}>
                      {formatMarketPrice(trade.stopLoss, currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Target</p>
                    <p className={NUMERIC_CLASS}>
                      {formatMarketPrice(trade.profitTarget, currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Planned Risk</p>
                    <p className={cn(NUMERIC_CLASS, "text-rose-500")}>
                      {formatCurrency(-Math.abs(trade.plannedRisk))}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Realized Risk</p>
                    <p className={cn(NUMERIC_CLASS, "text-rose-500")}>
                      {formatCurrency(-Math.abs(trade.realizedRisk))}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Entry</p>
                    <p className={NUMERIC_CLASS}>
                      {formatMarketPrice(trade.entryPrice, currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Exit</p>
                    <p className={NUMERIC_CLASS}>
                      {(trade.status ?? "Closed") === "Active" || trade.exitPrice <= 0
                        ? "—"
                        : formatMarketPrice(trade.exitPrice, currency)}
                    </p>
                  </div>
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Notes & Reflection</h3>
                <div className="rounded-lg border border-border bg-card p-3">
                  <p className="text-sm leading-relaxed text-foreground/90">
                    {trade.notes || "No notes recorded."}
                  </p>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Mindset rating: {trade.mindset}/5
                  </p>
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Chart Screenshots</h3>
                {trade.screenshots.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {trade.screenshots.map((src) =>
                      src.startsWith("data:image/") ||
                      src.startsWith("http") ? (
                        <ChartScreenshotPreview
                          key={src.slice(0, 64)}
                          src={src}
                          alt="Trade chart screenshot"
                          thumbnailClassName="aspect-video bg-muted/20"
                          wrapperClassName="rounded-lg"
                        />
                      ) : (
                        <div
                          key={src.slice(0, 64)}
                          className="flex aspect-video items-center justify-center overflow-hidden rounded-lg border border-border bg-card"
                        >
                          <div className="flex flex-col items-center gap-1 text-muted-foreground">
                            <ImageIcon className="size-6" />
                            <span className="max-w-[90%] truncate text-[10px]">
                              {src.split("/").pop()}
                            </span>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <div className="flex h-28 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
                    No screenshots attached
                  </div>
                )}
              </section>
            </div>
          </ScrollArea>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
