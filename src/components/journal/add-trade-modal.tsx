"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DateTimeField, formatDateTimeFieldValue } from "@/components/journal/datetime-field";
import { ChartScreenshotPreview } from "@/components/journal/chart-screenshot-preview";
import { SmartPositionSizer } from "@/components/journal/smart-position-sizer";
import { useSettings } from "@/components/settings/settings-provider";
import {
  type JournalTrade,
  type JournalTradeStatus,
} from "@/lib/journal-types";
import {
  defaultListingMarketForCurrency,
  EQUITY_LISTING_MARKETS,
  LISTING_MARKET_IDS,
  normalizeListingMarket,
  type ListingMarketId,
} from "@/lib/equity-listing-markets";
import { cn } from "@/lib/utils";

const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;

const inputClass = "h-9 bg-background";
const numberInputClass = cn(
  inputClass,
  "font-sans tabular-nums [font-feature-settings:'tnum'_1,'lnum'_1]"
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
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

type FormSectionTone = "sky" | "emerald" | "violet";

const formSectionHeaderTone: Record<FormSectionTone, string> = {
  sky: "border-sky-300/50 bg-gradient-to-r from-sky-100 via-sky-100/85 to-cyan-100/70 dark:border-sky-800/55 dark:from-sky-950/65 dark:via-sky-950/45 dark:to-cyan-950/35",
  emerald:
    "border-emerald-300/50 bg-gradient-to-r from-emerald-100 via-emerald-100/85 to-teal-100/65 dark:border-emerald-800/55 dark:from-emerald-950/65 dark:via-emerald-950/45 dark:to-teal-950/35",
  violet:
    "border-violet-300/50 bg-gradient-to-r from-violet-100 via-violet-100/85 to-indigo-100/65 dark:border-violet-800/55 dark:from-violet-950/65 dark:via-violet-950/45 dark:to-indigo-950/35",
};

function FormSection({
  title,
  description,
  tone = "sky",
  className,
  children,
}: {
  title: string;
  description?: string;
  tone?: FormSectionTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-card shadow-none",
        className
      )}
    >
      <div
        className={cn(
          "border-b px-4 py-3",
          formSectionHeaderTone[tone]
        )}
      >
        <h3 className="text-sm font-semibold tracking-tight text-foreground">
          {title}
        </h3>
        {description ? (
          <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      <div className="bg-card p-4">{children}</div>
    </section>
  );
}

export function AddTradeModal({
  open,
  onOpenChange,
  initialTrade,
  onSave,
}: AddTradeModalProps) {
  const { settings } = useSettings();
  const defaultMarket = defaultListingMarketForCurrency(
    settings.profile.currency
  );
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
  const [screenshotSrc, setScreenshotSrc] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [screenshotDragActive, setScreenshotDragActive] = useState(false);
  const tradeStatus = form.watch("status");
  const entryDate = form.watch("entryDate");
  const entryPriceWatch = form.watch("entryPrice");
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

  function onSubmit(values: TradeFormValues) {
    const direction = initialTrade?.direction ?? "Long";
    const assetClass = initialTrade?.assetClass ?? "Equities";
    const fees = initialTrade?.fees ?? 0;
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
      ticker: values.ticker.toUpperCase(),
      listingMarket: values.listingMarket as ListingMarketId,
      assetClass,
      direction,
      status: values.status as JournalTradeStatus,
      outcome,
      strategy: initialTrade?.strategy ?? "",
      tags: initialTrade?.tags ?? [],
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
      mindset: initialTrade?.mindset ?? 3,
      notes: values.notes ?? "",
      psychology: initialTrade?.psychology ?? [],
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
      <DialogContent className="flex max-h-[min(90dvh,840px)] w-[calc(100vw-1.5rem)] max-w-[calc(100vw-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:w-[min(92vw,80rem)] sm:max-w-[min(92vw,80rem)]">
        <DialogHeader className="shrink-0 space-y-1 border-b border-slate-300/50 bg-gradient-to-r from-slate-100 via-slate-100/90 to-zinc-100/75 px-6 py-4 text-left dark:border-slate-700/55 dark:from-slate-900/70 dark:via-slate-900/50 dark:to-zinc-950/40">
          <DialogTitle className="text-lg font-semibold tracking-tight">
            {initialTrade ? "Edit trade" : "Log new trade"}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
              <div className="space-y-4">
                <FormSection
                  title="Setup"
                  description="Instrument and session timing"
                  tone="sky"
                >
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Controller
                      control={form.control}
                      name="listingMarket"
                      render={({ field }) => (
                        <Field label="Market / exchange">
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
                    <Field label="Ticker symbol">
                      <Input
                        {...form.register("ticker")}
                        placeholder="e.g. AAPL"
                        className={cn(inputClass, "font-mono uppercase")}
                      />
                    </Field>
                    <Controller
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <Field label="Status">
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
                    <Controller
                      control={form.control}
                      name="entryDate"
                      render={({ field }) => (
                        <DateTimeField
                          label="Entry date & time"
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
                          label="Exit date & time"
                          value={field.value}
                          onChange={field.onChange}
                          disabled={exitFieldsDisabled}
                        />
                      )}
                    />
                  </div>
                </FormSection>

                <FormSection
                  title="Pricing & risk"
                  description="Fill prices, size, and planned levels"
                  tone="emerald"
                >
                  <SmartPositionSizer
                    entryPrice={entryPriceWatch}
                    direction={initialTrade?.direction ?? "Long"}
                    defaultCapital={settings.profile.startingBalance}
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
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                    <Field label="Entry price">
                      <Input
                        type="number"
                        step="any"
                        className={numberInputClass}
                        {...form.register("entryPrice")}
                      />
                    </Field>
                    <Field label="Exit price">
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
                    <Field label="Quantity">
                      <Input
                        type="number"
                        step="any"
                        className={numberInputClass}
                        {...form.register("quantity")}
                      />
                    </Field>
                    <Field label="Stop loss">
                      <Input
                        type="number"
                        step="any"
                        className={numberInputClass}
                        {...form.register("stopLoss")}
                      />
                    </Field>
                    <Field label="Profit target" className="col-span-2 sm:col-span-1">
                      <Input
                        type="number"
                        step="any"
                        className={numberInputClass}
                        {...form.register("profitTarget")}
                      />
                    </Field>
                  </div>
                </FormSection>
              </div>

              <FormSection
                title="Journal"
                description="Notes and chart attachment"
                tone="violet"
                className="lg:sticky lg:top-0"
              >
                <div className="space-y-4">
                  <Field label="Trade notes">
                    <Textarea
                      rows={5}
                      placeholder="Thesis, execution quality, lessons learned…"
                      className="min-h-[7.5rem] resize-y bg-background text-sm lg:min-h-[10rem]"
                      {...form.register("notes")}
                    />
                  </Field>

                  <Field label="Chart screenshot">
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
                        "rounded-lg border border-dashed border-border bg-muted/15 p-3 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-emerald-600/30",
                        screenshotDragActive &&
                          "border-emerald-500/50 bg-emerald-500/5 ring-2 ring-emerald-600/20"
                      )}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5 bg-background"
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
                      <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
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
              <p className="mt-4 text-sm text-rose-600 dark:text-rose-400">
                Check required fields and numeric values in each section.
              </p>
            ) : null}
          </div>

          <DialogFooter className="m-0 shrink-0 rounded-none border-t border-border bg-muted/25 px-6 py-4 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="h-9"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="h-9">
              {initialTrade ? "Save changes" : "Save trade"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
