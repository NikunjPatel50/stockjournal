"use client";

import { useEffect, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { TradeField } from "@/components/journal/trade-form-field";
import {
  DateTimeField,
  formatDateTimeFieldValue,
} from "@/components/journal/datetime-field";
import { useJournalMarket } from "@/components/journal/journal-market-provider";
import {
  formatSignedMoney,
  type JournalTrade,
} from "@/lib/journal-types";
import {
  applyPartialExit,
  previewPartialExitPnl,
  type PartialExitInput,
} from "@/lib/partial-exit";
import { cn, NUMERIC_CLASS } from "@/lib/utils";

const numberInputClass =
  "h-9 font-mono tabular-nums [font-feature-settings:'tnum'_1,'lnum'_1]";

const partialExitSchema = z.object({
  exitPrice: z.coerce.number().positive("Exit price is required"),
  quantity: z.coerce.number().positive("Quantity is required"),
  exitDate: z.string().min(1, "Exit date is required"),
});

type PartialExitFormInput = z.input<typeof partialExitSchema>;
type PartialExitFormValues = z.output<typeof partialExitSchema>;

export function PartialExitModal({
  open,
  onOpenChange,
  trade,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trade: JournalTrade | null;
  onConfirm: (result: {
    closedLot: JournalTrade;
    updatedActive: JournalTrade | null;
  }) => void;
}) {
  const { activeCurrency } = useJournalMarket();
  const maxQty = trade?.quantity ?? 0;

  const form = useForm<PartialExitFormInput, unknown, PartialExitFormValues>({
    resolver: zodResolver(partialExitSchema),
    defaultValues: {
      exitPrice: 0,
      quantity: 1,
      exitDate: formatDateTimeFieldValue(new Date()),
    },
  });

  const exitPrice = form.watch("exitPrice");
  const quantity = form.watch("quantity");
  const exitDate = form.watch("exitDate");

  useEffect(() => {
    if (!open || !trade) return;
    const defaultQty =
      trade.quantity > 1
        ? Math.max(1, Math.floor(trade.quantity / 2))
        : trade.quantity;
    form.reset({
      exitPrice: 0,
      quantity: defaultQty,
      exitDate: formatDateTimeFieldValue(new Date()),
    });
  }, [open, trade, form]);

  const preview = useMemo(() => {
    const qty = Number(quantity);
    if (!trade || !qty || qty > trade.quantity) return null;
    const input: PartialExitInput = {
      exitPrice: Number(exitPrice) || 0,
      quantity: qty,
      exitDate,
    };
    if (input.exitPrice <= 0 || input.quantity <= 0) return null;
    try {
      const pnl = previewPartialExitPnl(trade, input);
      const remaining = trade.quantity - input.quantity;
      return { pnl, remaining };
    } catch {
      return null;
    }
  }, [trade, exitPrice, quantity, exitDate]);

  function onSubmit(values: PartialExitFormValues) {
    if (!trade) return;
    if (values.quantity > trade.quantity) {
      form.setError("quantity", {
        message: `Max ${trade.quantity} shares open`,
      });
      return;
    }

    const input: PartialExitInput = {
      exitPrice: values.exitPrice,
      quantity: values.quantity,
      exitDate: values.exitDate,
    };

    const result = applyPartialExit(trade, input);
    onConfirm(result);
    onOpenChange(false);
  }

  if (!trade) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border/80 px-6 py-4 text-left">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Partial exit
          </p>
          <DialogTitle className="mt-1 text-base font-semibold">
            Sell part of {trade.ticker}
          </DialogTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Record a scale-out now and keep the rest of the position active.
            Open qty: {trade.quantity}
          </p>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4 px-6 py-5"
        >
          <div className="grid grid-cols-2 gap-3">
            <TradeField label="Exit price">
              <Input
                type="number"
                step="any"
                className={numberInputClass}
                {...form.register("exitPrice")}
              />
            </TradeField>
            <TradeField label="Qty to sell">
              <Input
                type="number"
                step="any"
                min={0}
                max={maxQty}
                className={numberInputClass}
                {...form.register("quantity")}
              />
            </TradeField>
          </div>

          <DateTimeField
            label="Exit date"
            value={exitDate}
            onChange={(value) => form.setValue("exitDate", value)}
          />

          {preview ? (
            <div className="rounded-md border border-border/70 bg-muted/20 px-3 py-2.5 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Realized on this sale</span>
                <span
                  className={cn(
                    "font-semibold",
                    NUMERIC_CLASS,
                    preview.pnl > 0 && "text-emerald-600 dark:text-emerald-400",
                    preview.pnl < 0 && "text-rose-600 dark:text-rose-400"
                  )}
                >
                  {formatSignedMoney(preview.pnl, activeCurrency)}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {preview.remaining > 0
                  ? `${preview.remaining} share${preview.remaining === 1 ? "" : "s"} stay active after this exit.`
                  : "This closes the full position."}
              </p>
            </div>
          ) : null}

          <DialogFooter className="gap-2 px-0 pb-0 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Record partial exit</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
