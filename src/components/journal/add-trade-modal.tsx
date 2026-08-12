"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { Upload, X } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TradeField, TRADE_FIELD_LABELS } from "@/components/journal/trade-form-field";
import { Textarea } from "@/components/ui/textarea";
import { DateTimeField, formatDateTimeFieldValue } from "@/components/journal/datetime-field";
import { ChartScreenshotPreview } from "@/components/journal/chart-screenshot-preview";
import { EarningsCheck } from "@/components/journal/earnings-check";
import { PlannedRPreview } from "@/components/journal/planned-r-preview";
import { SmartAtrLevels } from "@/components/journal/smart-atr-levels";
import { SmartPositionSizer } from "@/components/journal/smart-position-sizer";
import {
  TickerSearchInput,
  type TickerSearchInputHandle,
} from "@/components/journal/ticker-search-input";
import { useSettings } from "@/components/settings/settings-provider";
import { useJournalMarket } from "@/components/journal/journal-market-provider";
import {
  type AssetClass,
  type JournalDirection,
  type JournalTrade,
  type JournalTradeStatus,
} from "@/lib/journal-types";
import {
  EQUITY_LISTING_MARKETS,
  LISTING_MARKET_IDS,
  normalizeListingMarket,
  type ListingMarketId,
} from "@/lib/equity-listing-markets";
import { normalizeEquityTicker } from "@/lib/ticker-normalize";
import { computeCapitalBase } from "@/lib/overnight-risk";
import { cn } from "@/lib/utils";

const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;

const inputClass =
  "h-8 rounded-md border-border/80 bg-background text-sm shadow-none";
const numberInputClass = cn(
  inputClass,
  "font-mono tabular-nums [font-feature-settings:'tnum'_1,'lnum'_1]"
);

function currentDateTimeValue() {
  return formatDateTimeFieldValue(new Date());
}

function isoToDateTimeFieldValue(iso: string): string {
  const trimmed = iso.trim();
  if (!trimmed) return currentDateTimeValue();
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 16);
  }
  return formatDateTimeFieldValue(new Date(trimmed));
}

function screenshotLabel(src: string): string {
  if (src.startsWith("data:")) {
    const match = src.match(/^data:image\/png;base64,/);
    return match ? "chart-screenshot.png" : "screenshot.png";
  }
  return src.split("/").pop() ?? "screenshot.png";
}

function imageFileFromDataTransfer(data: DataTransfer): File | null {
  for (const item of data.items) {
    if (item.kind === "file" && item.type.startsWith("image/")) {
      return item.getAsFile();
    }
  }
  const file = data.files?.[0];
  if (file?.type.startsWith("image/")) return file;
  return null;
}

function imageFileFromClipboard(data: DataTransfer): File | null {
  return imageFileFromDataTransfer(data);
}

function blobToPngDataUrl(blob: Blob): Promise<string> {
  if (blob.type === "image/png") {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") resolve(reader.result);
        else reject(new Error("read failed"));
      };
      reader.onerror = () => reject(new Error("read failed"));
      reader.readAsDataURL(blob);
    });
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("canvas failed"));
          return;
        }
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch {
        reject(new Error("convert failed"));
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image failed"));
    };
    img.src = url;
  });
}

function isTextPasteTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest(
      "textarea, input:not([type=file]), [contenteditable='true']"
    )
  );
}

const numberField = z
  .union([z.number(), z.string()])
  .transform((v) => (typeof v === "string" ? Number(v) : v))
  .refine((v) => Number.isFinite(v), "Must be a number");

const tradeSchema = z
  .object({
    listingMarket: z.enum(LISTING_MARKET_IDS),
    ticker: z.string().min(1, "Ticker is required"),
    status: z.enum(["Closed", "Active"]),
    entryDate: z.string().min(1),
    exitDate: z.string().min(1),
    entryPrice: numberField.pipe(z.number().positive()),
    exitPrice: numberField,
    quantity: numberField.pipe(z.number().positive()),
    stopLoss: numberField.pipe(z.number().positive()),
    profitTarget: numberField.pipe(z.number().positive()),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status !== "Closed") return;
    if (!Number.isFinite(data.exitPrice) || data.exitPrice <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Exit price is required for closed trades",
        path: ["exitPrice"],
      });
    }
  });

type TradeFormInput = z.input<typeof tradeSchema>;
type TradeFormValues = z.output<typeof tradeSchema>;

interface AddTradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTrade?: JournalTrade | null;
  trades?: JournalTrade[];
  onSave: (trade: JournalTrade) => void;
}

function deriveOutcome(pnl: number): JournalTrade["outcome"] {
  if (Math.abs(pnl) < 1) return "Breakeven";
  return pnl > 0 ? "Win" : "Loss";
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <TradeField label={label} className={className}>
      {children}
    </TradeField>
  );
}

function FormSection({
  index,
  title,
  description,
  className,
  children,
}: {
  index: string;
  title: string;
  description?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("space-y-4", className)}>
      <div className="flex items-center gap-3 border-b border-border/70 pb-2.5">
        <span className="flex size-5 shrink-0 items-center justify-center rounded-sm bg-muted font-mono text-[10px] font-semibold tabular-nums text-muted-foreground ring-1 ring-border/60">
          {index}
        </span>
        <div className="min-w-0">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-foreground">
            {title}
          </h3>
          {description ? (
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  );
}

export function AddTradeModal({
  open,
  onOpenChange,
  initialTrade,
  trades = [],
  onSave,
}: AddTradeModalProps) {
  const { settings } = useSettings();
  const { defaultListingMarket, activeCurrency } = useJournalMarket();
  const defaultMarket = defaultListingMarket;
  const defaultCapital = useMemo(() => computeCapitalBase(trades), [trades]);
  const [tradeMeta, setTradeMeta] = useState<{
    direction: JournalDirection;
    assetClass: AssetClass;
    strategy: string;
    tags: string[];
    psychology: string[];
    fees: number;
    mindset: number;
  }>({
    direction: "Long",
    assetClass: "Equities",
    strategy: "",
    tags: [],
    psychology: [],
    fees: 0,
    mindset: 3,
  });
  const form = useForm<TradeFormInput, unknown, TradeFormValues>({
    resolver: zodResolver(tradeSchema),
    defaultValues: {
      listingMarket: defaultMarket,
      ticker: "",
      status: "Active",
      entryDate: currentDateTimeValue(),
      exitDate: currentDateTimeValue(),
      entryPrice: 0,
      exitPrice: 0,
      quantity: 1,
      stopLoss: 0,
      profitTarget: 0,
      notes: "",
    },
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tickerInputRef = useRef<TickerSearchInputHandle>(null);
  const [screenshotSrc, setScreenshotSrc] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [screenshotDragActive, setScreenshotDragActive] = useState(false);
  const tradeStatus = form.watch("status");
  const listingMarket = form.watch("listingMarket");
  const tickerWatch = form.watch("ticker");
  const entryDate = form.watch("entryDate");
  const entryPriceWatch = form.watch("entryPrice");
  const stopLossWatch = form.watch("stopLoss");
  const profitTargetWatch = form.watch("profitTarget");
  const quantityWatch = form.watch("quantity");
  const exitFieldsDisabled = tradeStatus === "Active";

  useEffect(() => {
    if (exitFieldsDisabled && entryDate) {
      form.setValue("exitDate", entryDate);
    }
  }, [entryDate, exitFieldsDisabled, form]);

  useEffect(() => {
    if (!open) return;
    setUploadError(null);
    setScreenshotDragActive(false);
    setScreenshotSrc(initialTrade?.screenshots[0] ?? "");
    if (initialTrade) {
      setTradeMeta({
        direction: initialTrade.direction,
        assetClass: initialTrade.assetClass,
        strategy: initialTrade.strategy,
        tags: [...initialTrade.tags],
        psychology: [...initialTrade.psychology],
        fees: initialTrade.fees,
        mindset: initialTrade.mindset,
      });
      form.reset({
        listingMarket:
          initialTrade.listingMarket != null
            ? (normalizeListingMarket(initialTrade.listingMarket) as ListingMarketId)
            : defaultMarket,
        ticker: initialTrade.ticker,
        status: initialTrade.status ?? "Closed",
        entryDate: isoToDateTimeFieldValue(initialTrade.entryDate),
        exitDate:
          (initialTrade.status ?? "Closed") === "Active"
            ? isoToDateTimeFieldValue(initialTrade.entryDate)
            : isoToDateTimeFieldValue(initialTrade.exitDate),
        entryPrice: initialTrade.entryPrice,
        exitPrice:
          (initialTrade.status ?? "Closed") === "Active"
            ? 0
            : initialTrade.exitPrice,
        quantity: initialTrade.quantity,
        stopLoss: initialTrade.stopLoss,
        profitTarget: initialTrade.profitTarget,
        notes: initialTrade.notes,
      });
    } else {
      setTradeMeta({
        direction: "Long",
        assetClass: "Equities",
        strategy: "",
        tags: [],
        psychology: [],
        fees: 0,
        mindset: 3,
      });
      form.reset({
        listingMarket: defaultMarket,
        ticker: "",
        status: "Active",
        entryDate: currentDateTimeValue(),
        exitDate: currentDateTimeValue(),
        entryPrice: 0,
        exitPrice: 0,
        quantity: 1,
        stopLoss: 0,
        profitTarget: 0,
        notes: "",
      });
    }
  }, [open, initialTrade, form]);

  const applyScreenshotBlob = useCallback(async (blob: Blob) => {
    setUploadError(null);

    if (blob.size > MAX_SCREENSHOT_BYTES) {
      setUploadError("File must be 5 MB or smaller.");
      return;
    }

    try {
      const dataUrl = await blobToPngDataUrl(blob);
      const approxBytes = Math.ceil((dataUrl.length * 3) / 4);
      if (approxBytes > MAX_SCREENSHOT_BYTES) {
        setUploadError("File must be 5 MB or smaller.");
        return;
      }
      setScreenshotSrc(dataUrl);
    } catch {
      setUploadError("Could not read pasted image.");
    }
  }, []);

  const applyClipboardImage = useCallback(
    (data: DataTransfer | null) => {
      const file = data ? imageFileFromClipboard(data) : null;
      if (!file) return false;
      void applyScreenshotBlob(file);
      return true;
    },
    [applyScreenshotBlob]
  );

  useEffect(() => {
    if (!open) return;

    function onDocumentPaste(event: ClipboardEvent) {
      if (isTextPasteTarget(event.target)) return;
      if (applyClipboardImage(event.clipboardData)) {
        event.preventDefault();
      }
    }

    document.addEventListener("paste", onDocumentPaste);
    return () => document.removeEventListener("paste", onDocumentPaste);
  }, [open, applyClipboardImage]);

  function handleScreenshotFile(file: File | null) {
    if (!file) return;

    if (file.type !== "image/png") {
      setUploadError("Only PNG files are allowed.");
      return;
    }

    void applyScreenshotBlob(file);
  }

  function handleScreenshotZonePaste(
    event: React.ClipboardEvent<HTMLDivElement>
  ) {
    if (applyClipboardImage(event.clipboardData)) {
      event.preventDefault();
    }
  }

  function handleScreenshotDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setScreenshotDragActive(true);
  }

  function handleScreenshotDragLeave(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const related = event.relatedTarget;
    if (related instanceof Node && event.currentTarget.contains(related)) {
      return;
    }
    setScreenshotDragActive(false);
  }

  function handleScreenshotDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setScreenshotDragActive(false);
    const file = imageFileFromDataTransfer(event.dataTransfer);
    if (!file) {
      setUploadError("Drop an image file or screenshot.");
      return;
    }
    void applyScreenshotBlob(file);
  }

  function clearScreenshot() {
    setScreenshotSrc("");
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function onSubmit(values: TradeFormValues) {
    const tickerCommitted = await tickerInputRef.current?.commit();
    if (tickerCommitted === false) return;

    const resolvedTicker = normalizeEquityTicker(form.getValues("ticker"));
    if (!resolvedTicker) {
      form.setError("ticker", { message: "Ticker is required" });
      return;
    }

    const direction = tradeMeta.direction;
    const assetClass = tradeMeta.assetClass;
    const fees = tradeMeta.fees;
    const exitPrice =
      values.status === "Active" ? 0 : values.exitPrice;
    const exitDate =
      values.status === "Active" ? values.entryDate : values.exitDate;
    const gross =
      values.status === "Active"
        ? 0
        : direction === "Long"
          ? (values.exitPrice - values.entryPrice) * values.quantity
          : (values.entryPrice - values.exitPrice) * values.quantity;
    const pnl = gross - fees;
    const notional = values.entryPrice * values.quantity;
    const roi = notional ? (pnl / notional) * 100 : 0;
    const holdMs =
      values.status === "Active"
        ? 0
        : new Date(exitDate).getTime() - new Date(values.entryDate).getTime();
    const holdTimeHours = Math.max(holdMs / (1000 * 60 * 60), 0);
    const plannedRisk = Math.abs(values.entryPrice - values.stopLoss) * values.quantity;
    const reward = Math.abs(values.profitTarget - values.entryPrice) * values.quantity;
    const rr =
      plannedRisk > 0 ? `1:${(reward / plannedRisk).toFixed(1)}` : "1:1.0";

    const outcome =
      values.status === "Active"
        ? "Breakeven"
        : deriveOutcome(pnl);

    const trade: JournalTrade = {
      id: initialTrade?.id ?? crypto.randomUUID(),
      ticker: resolvedTicker,
      listingMarket: values.listingMarket as ListingMarketId,
      assetClass,
      direction,
      status: values.status as JournalTradeStatus,
      outcome,
      strategy: tradeMeta.strategy,
      tags: tradeMeta.tags,
      entryDate: values.entryDate,
      exitDate,
      entryPrice: values.entryPrice,
      exitPrice,
      quantity: values.quantity,
      fees,
      stopLoss: values.stopLoss,
      profitTarget: values.profitTarget,
      pnl: Math.round(pnl * 100) / 100,
      roi: Math.round(roi * 100) / 100,
      holdTimeHours: Math.round(holdTimeHours * 100) / 100,
      riskReward: rr,
      plannedRisk: Math.round(plannedRisk * 100) / 100,
      realizedRisk: pnl < 0 ? Math.abs(pnl) : 0,
      mindset: tradeMeta.mindset,
      notes: values.notes ?? "",
      psychology: tradeMeta.psychology,
      executions:
        values.status === "Active"
          ? [
              {
                id: "e1",
                time: values.entryDate,
                side: "Entry" as const,
                price: values.entryPrice,
                quantity: values.quantity,
                fees,
              },
            ]
          : [
              {
                id: "e1",
                time: values.entryDate,
                side: "Entry" as const,
                price: values.entryPrice,
                quantity: values.quantity,
                fees: fees / 2,
              },
              {
                id: "e2",
                time: exitDate,
                side: "Exit" as const,
                price: values.exitPrice,
                quantity: values.quantity,
                fees: fees / 2,
              },
            ],
      screenshots: screenshotSrc ? [screenshotSrc] : [],
    };

    onSave(trade);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90dvh,840px)] w-[calc(100vw-1.5rem)] max-w-[calc(100vw-1.5rem)] flex-col gap-0 overflow-hidden rounded-lg border border-border/80 p-0 shadow-2xl sm:w-[min(92vw,80rem)] sm:max-w-[min(92vw,80rem)]">
        <DialogHeader className="shrink-0 space-y-0 border-b border-border/80 bg-background px-6 py-4 text-left">
          <div className="flex flex-wrap items-start justify-between gap-3 pr-8">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Trade entry
              </p>
              <DialogTitle className="mt-1 text-base font-semibold tracking-tight text-foreground">
                {initialTrade ? "Edit trade" : "Log new trade"}
              </DialogTitle>
              <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted-foreground">
                Instrument, execution prices, planned risk, and journal notes in
                one record.
              </p>
            </div>
            <span
              className={cn(
                "inline-flex shrink-0 items-center rounded-sm px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ring-1",
                tradeStatus === "Active"
                  ? "bg-amber-500/10 text-amber-800 ring-amber-500/25 dark:text-amber-300"
                  : "bg-muted text-muted-foreground ring-border/80"
              )}
            >
              {tradeStatus}
            </span>
          </div>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-1 overflow-y-auto bg-muted/15 px-6 py-5">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,22rem)] lg:items-start lg:gap-0 lg:divide-x lg:divide-border/70">
              <div className="space-y-8 lg:pr-8">
                <FormSection
                  index="01"
                  title="Setup"
                  description="Instrument and session timing"
                >
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Controller
                        control={form.control}
                        name="listingMarket"
                        render={({ field }) => (
                          <Field label={TRADE_FIELD_LABELS.exchange}>
                            <Select
                              value={field.value}
                              onValueChange={(value) => {
                                if (
                                  LISTING_MARKET_IDS.includes(
                                    value as ListingMarketId
                                  )
                                ) {
                                  field.onChange(value);
                                }
                              }}
                            >
                              <SelectTrigger className={cn(inputClass, "w-full")}>
                                <SelectValue placeholder="Select market" />
                              </SelectTrigger>
                              <SelectContent
                                align="start"
                                className="max-h-[min(20rem,70vh)]"
                              >
                                {EQUITY_LISTING_MARKETS.map((market) => (
                                  <SelectItem key={market.id} value={market.id}>
                                    {market.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </Field>
                        )}
                      />
                      <Controller
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <Field label={TRADE_FIELD_LABELS.tradeStatus}>
                            <Select
                              value={field.value}
                              onValueChange={(value) => {
                                if (value === "Closed" || value === "Active") {
                                  field.onChange(value);
                                  if (value === "Active") {
                                    form.setValue("exitPrice", 0);
                                    form.setValue(
                                      "exitDate",
                                      form.getValues("entryDate")
                                    );
                                  }
                                }
                              }}
                            >
                              <SelectTrigger className={cn(inputClass, "w-full")}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Closed">Closed</SelectItem>
                                <SelectItem value="Active">Active</SelectItem>
                              </SelectContent>
                            </Select>
                          </Field>
                        )}
                      />
                    </div>
                    <Controller
                      control={form.control}
                      name="ticker"
                      render={({ field, fieldState }) => (
                        <Field label={TRADE_FIELD_LABELS.symbol} className="w-full min-w-0">
                          <TickerSearchInput
                            ref={tickerInputRef}
                            value={field.value}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            listingMarket={listingMarket}
                            error={fieldState.error?.message}
                            className={cn(inputClass, "w-full")}
                          />
                        </Field>
                      )}
                    />
                    <EarningsCheck
                      ticker={tickerWatch}
                      listingMarket={listingMarket}
                      entryDate={entryDate}
                      currency={activeCurrency}
                    />
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Controller
                        control={form.control}
                        name="entryDate"
                        render={({ field }) => (
                          <DateTimeField
                            label={TRADE_FIELD_LABELS.entryDate}
                            value={field.value}
                            onChange={field.onChange}
                          />
                        )}
                      />
                      <Controller
                        control={form.control}
                        name="exitDate"
                        render={({ field }) => (
                          <DateTimeField
                            label={TRADE_FIELD_LABELS.exitDate}
                            value={field.value}
                            onChange={field.onChange}
                            disabled={exitFieldsDisabled}
                          />
                        )}
                      />
                    </div>
                  </div>
                </FormSection>

                <FormSection
                  index="02"
                  title="Pricing & risk"
                  description="Execution levels, size, and planned R"
                >
                  <div className="rounded-md border border-border/70 bg-background/80 p-2">
                    <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      Assistants
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                    <SmartPositionSizer
                      entryPrice={entryPriceWatch}
                      direction={tradeMeta.direction}
                      defaultCapital={defaultCapital}
                      defaultRiskReward={settings.risk.defaultRiskReward}
                      onApply={(result) => {
                        queueMicrotask(() => {
                          form.setValue("entryPrice", result.entryPrice, {
                            shouldValidate: true,
                          });
                          form.setValue("quantity", result.quantity, {
                            shouldValidate: true,
                          });
                          form.setValue("stopLoss", result.stopLoss, {
                            shouldValidate: true,
                          });
                          form.setValue("profitTarget", result.profitTarget, {
                            shouldValidate: true,
                          });
                        });
                      }}
                    />
                    <SmartAtrLevels
                      ticker={tickerWatch}
                      listingMarket={listingMarket}
                      entryDate={entryDate}
                      entryPrice={entryPriceWatch}
                      direction={tradeMeta.direction}
                      onBeforeOpen={async () => {
                        await tickerInputRef.current?.commit();
                        return form.getValues("ticker");
                      }}
                      onApply={(result) => {
                        queueMicrotask(() => {
                          form.setValue("entryPrice", result.entryPrice, {
                            shouldValidate: true,
                          });
                          form.setValue("stopLoss", result.stopLoss, {
                            shouldValidate: true,
                          });
                          form.setValue("profitTarget", result.profitTarget, {
                            shouldValidate: true,
                          });
                        });
                      }}
                    />
                    </div>
                  </div>
                  {tradeMeta.strategy || tradeMeta.tags.length > 0 ? (
                    <div className="rounded-md border border-border/60 bg-muted/25 px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                        Applied context
                      </p>
                      <p className="mt-1 font-mono text-[11px] text-foreground/90">
                        {tradeMeta.strategy ? (
                          <span>Strategy: {tradeMeta.strategy}</span>
                        ) : null}
                        {tradeMeta.strategy && tradeMeta.tags.length > 0
                          ? " · "
                          : null}
                        {tradeMeta.tags.length > 0 ? (
                          <span>Tags: {tradeMeta.tags.join(", ")}</span>
                        ) : null}
                      </p>
                    </div>
                  ) : null}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                    <Field label={TRADE_FIELD_LABELS.entryPrice}>
                      <Input
                        type="number"
                        step="any"
                        className={numberInputClass}
                        {...form.register("entryPrice")}
                      />
                    </Field>
                    <Field label={TRADE_FIELD_LABELS.exitPrice}>
                      <Input
                        type="number"
                        step="any"
                        disabled={exitFieldsDisabled}
                        className={cn(
                          numberInputClass,
                          exitFieldsDisabled && "cursor-not-allowed opacity-60"
                        )}
                        {...form.register("exitPrice")}
                      />
                    </Field>
                    <Field label={TRADE_FIELD_LABELS.quantity}>
                      <Input
                        type="number"
                        step="any"
                        className={numberInputClass}
                        {...form.register("quantity")}
                      />
                    </Field>
                    <Field label={TRADE_FIELD_LABELS.stopLoss}>
                      <Input
                        type="number"
                        step="any"
                        className={numberInputClass}
                        {...form.register("stopLoss")}
                      />
                    </Field>
                    <Field label={TRADE_FIELD_LABELS.targetPrice} className="col-span-2 sm:col-span-1">
                      <Input
                        type="number"
                        step="any"
                        className={numberInputClass}
                        {...form.register("profitTarget")}
                      />
                    </Field>
                  </div>
                  <PlannedRPreview
                    entryPrice={entryPriceWatch}
                    stopLoss={stopLossWatch}
                    profitTarget={profitTargetWatch}
                    quantity={quantityWatch}
                    direction={tradeMeta.direction}
                  />
                </FormSection>
              </div>

              <FormSection
                index="03"
                title="Journal"
                description="Notes and chart attachment"
                className="lg:sticky lg:top-0 lg:pl-8"
              >
                <div className="space-y-4">
                  <Field label={TRADE_FIELD_LABELS.notes}>
                    <Textarea
                      rows={5}
                      placeholder="Thesis, execution quality, lessons learned…"
                      className="min-h-[7.5rem] resize-y rounded-md border-border/80 bg-background text-sm shadow-none lg:min-h-[10rem]"
                      {...form.register("notes")}
                    />
                  </Field>

                  <Field label={TRADE_FIELD_LABELS.chartAttachment}>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png"
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        handleScreenshotFile(file);
                        e.target.value = "";
                      }}
                    />
                    <div
                      tabIndex={0}
                      role="group"
                      aria-label="Chart screenshot upload"
                      onPaste={handleScreenshotZonePaste}
                      onDragEnter={handleScreenshotDragOver}
                      onDragOver={handleScreenshotDragOver}
                      onDragLeave={handleScreenshotDragLeave}
                      onDrop={handleScreenshotDrop}
                      className={cn(
                        "rounded-md border border-border/80 bg-background/60 p-3 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/40",
                        screenshotDragActive &&
                          "border-foreground/25 bg-muted/40 ring-2 ring-ring/20"
                      )}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1.5 rounded-md border-border/80 bg-background text-xs"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Upload className="size-3.5" />
                          Upload PNG
                        </Button>
                        {screenshotSrc ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1 text-muted-foreground"
                            onClick={clearScreenshot}
                          >
                            <X className="size-3.5" />
                            Remove
                          </Button>
                        ) : null}
                      </div>
                      <p className="mt-2 font-mono text-[10px] leading-snug text-muted-foreground">
                        Drag, drop, or paste (⌘V) · PNG · 5 MB max
                      </p>
                      {uploadError ? (
                        <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">
                          {uploadError}
                        </p>
                      ) : null}
                      {screenshotSrc ? (
                        <div className="mt-3 max-h-[min(12rem,28vh)] overflow-hidden rounded-md">
                          <ChartScreenshotPreview
                            src={screenshotSrc}
                            alt="Chart screenshot preview"
                            caption={screenshotLabel(screenshotSrc)}
                          />
                        </div>
                      ) : null}
                    </div>
                  </Field>
                </div>
              </FormSection>
            </div>

            {Object.keys(form.formState.errors).length > 0 ? (
              <p className="mt-5 rounded-md border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-xs text-rose-700 dark:text-rose-300">
                Check required fields and numeric values in each section.
              </p>
            ) : null}
          </div>

          <DialogFooter className="m-0 shrink-0 items-center gap-2 rounded-none border-t border-border/80 bg-background px-6 py-3 sm:justify-between">
            <p className="hidden text-[10px] uppercase tracking-[0.08em] text-muted-foreground sm:block">
              All prices in {activeCurrency}
            </p>
            <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
              <Button
                type="button"
                variant="outline"
                className="h-8 rounded-md px-4 text-xs"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-8 rounded-md bg-foreground px-4 text-xs text-background hover:bg-foreground/90"
              >
                {initialTrade ? "Save changes" : "Save trade"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
