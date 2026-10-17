"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { format, parseISO } from "date-fns";
import { CalendarIcon, Layers, Loader2, Sparkles, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NumericInput } from "@/components/ui/numeric-input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ChartScreenshotPreview } from "@/components/journal/chart-screenshot-preview";
import {
  DateTimeField,
  formatDateTimeFieldValue,
} from "@/components/journal/datetime-field";
import {
  TickerSearchInput,
  type TickerSearchInputHandle,
} from "@/components/journal/ticker-search-input";
import { useJournalMarket } from "@/components/journal/journal-market-provider";
import {
  EQUITY_LISTING_MARKETS,
  LISTING_MARKET_IDS,
  normalizeListingMarket,
  type ListingMarketId,
} from "@/lib/equity-listing-markets";
import type { JournalTrade, JournalTradeStatus } from "@/lib/journal-types";
import {
  buildJournalTradeFromOptionsForm,
  draftFromJournalTrade,
  legsFromTemplate,
  netPremiumFromLegs,
  OPTIONS_LOG_TEMPLATES,
  type OptionsLegDraft,
  type OptionsTemplateId,
} from "@/lib/options-trade-form";
import { OptionsExitPlan } from "@/components/options/options-exit-plan";
import { OptionsPayoffSummary } from "@/components/options/options-payoff-summary";
import {
  buildExitPlan,
  DEFAULT_EXIT_PLAN_SETTINGS,
  spotFromBreakeven,
  type ExitPlanSettings,
} from "@/lib/options-exit-plan";
import {
  prewarmEquitySymbolSearch,
  resolveEquitySymbolForMarket,
} from "@/lib/equity-symbol-search-client";
import { sharesPerOptionLot } from "@/lib/nse-fo-lot-size";
import {
  hasPayoffMetrics,
  type OptionsPayoffMetrics,
} from "@/lib/options-trade-meta";
import {
  mergeParsedLegs,
  normalizeTemplateId,
  screenshotFillCompleteness,
  screenshotFillProgressLabel,
  underlyingSearchTextFromParsed,
  type ParsedOptionsScreenshot,
} from "@/lib/options-screenshot-parse";
import {
  Progress,
  ProgressIndicator,
  ProgressTrack,
} from "@/components/ui/progress";
import {
  formatTickerDisplayLabel,
  normalizeEquityTicker,
} from "@/lib/ticker-normalize";
import { cn, NUMERIC_CLASS } from "@/lib/utils";

const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;

const inputClass =
  "h-9 rounded-lg border-border/80 bg-background text-sm shadow-none";
const numberInputClass = cn(
  inputClass,
  "font-mono tabular-nums [font-feature-settings:'tnum'_1,'lnum'_1]"
);

function currentDateTimeValue() {
  return formatDateTimeFieldValue(new Date());
}

function titleCaseWords(label: string) {
  return label
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function isoToDateTimeFieldValue(iso: string): string {
  const trimmed = iso.trim();
  if (!trimmed) return currentDateTimeValue();
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 16);
  }
  return formatDateTimeFieldValue(new Date(trimmed));
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

function isTextPasteTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest(
      "textarea, input:not([type=file]), [contenteditable='true']"
    )
  );
}

const VISION_MAX_EDGE = 1280;
const VISION_JPEG_QUALITY = 0.72;

/** Downscale to a JPEG the vision model can read quickly. */
function imageBlobToVisionDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(
          1,
          VISION_MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight, 1)
        );
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("canvas failed"));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", VISION_JPEG_QUALITY));
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

const compactSelectClass = cn(
  inputClass,
  "h-8 min-h-8 rounded-md px-2 text-xs"
);
const compactInputClass = cn(
  numberInputClass,
  "h-8 min-h-8 rounded-md px-2 text-xs"
);
const fieldLabelClass =
  "text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground";

function ExpiryField({
  value,
  onChange,
  label,
  tableCell = false,
}: {
  value: string;
  onChange: (ymd: string) => void;
  label?: string;
  tableCell?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = value ? parseISO(value) : undefined;

  const trigger = (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className={cn(
              compactSelectClass,
              "w-full justify-start gap-1.5 font-normal"
            )}
          />
        }
      >
        <CalendarIcon className="size-3 shrink-0 text-muted-foreground" />
        <span className="truncate">
          {value ? format(parseISO(value), "MMM d, yy") : "Expiry"}
        </span>
      </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(day) => {
              if (day) {
                onChange(format(day, "yyyy-MM-dd"));
                setOpen(false);
              }
            }}
          />
        </PopoverContent>
      </Popover>
  );

  if (tableCell) return trigger;

  return (
    <div className="space-y-1.5">
      {label ? (
        <Label className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          {label}
        </Label>
      ) : null}
      {trigger}
    </div>
  );
}

function PanelHeading({ title, meta }: { title: string; meta?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
      {meta ? (
        <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          {meta}
        </span>
      ) : null}
    </div>
  );
}

export function LogOptionsPositionModal({
  open,
  onOpenChange,
  initialTrade,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTrade?: JournalTrade | null;
  onSave: (trade: JournalTrade) => void;
}) {
  const { defaultListingMarket, activeCurrency } = useJournalMarket();
  const tickerRef = useRef<TickerSearchInputHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const screenshotInputId = useId();

  const [underlying, setUnderlying] = useState("");
  const [listingMarket, setListingMarket] = useState<ListingMarketId>(
    defaultListingMarket
  );
  const [status, setStatus] = useState<JournalTradeStatus>("Active");
  const [templateId, setTemplateId] =
    useState<OptionsTemplateId>("bull_put_spread");
  const [legs, setLegs] = useState<OptionsLegDraft[]>(() =>
    legsFromTemplate("bull_put_spread")
  );
  const [contracts, setContracts] = useState(1);
  const [maxRisk, setMaxRisk] = useState(0);
  const [ivRank, setIvRank] = useState("");
  const [deltaAtEntry, setDeltaAtEntry] = useState("");
  const [tagsRaw, setTagsRaw] = useState("");
  const [entryDate, setEntryDate] = useState(currentDateTimeValue());
  const [exitDate, setExitDate] = useState(currentDateTimeValue());
  const [notes, setNotes] = useState("");
  const [payoff, setPayoff] = useState<OptionsPayoffMetrics | undefined>();
  const [spot, setSpot] = useState<number | undefined>();
  const [exitSettings, setExitSettings] = useState<ExitPlanSettings>(
    DEFAULT_EXIT_PLAN_SETTINGS
  );
  const [screenshotSrc, setScreenshotSrc] = useState("");
  const [fillFromScreenshot, setFillFromScreenshot] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [fillProgress, setFillProgress] = useState<{
    active: boolean;
    percent: number;
    label: string;
  }>({ active: false, percent: 0, label: "" });
  const [scanError, setScanError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [screenshotDragActive, setScreenshotDragActive] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const template = OPTIONS_LOG_TEMPLATES.find((t) => t.id === templateId);

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    setUploadError(null);

    if (initialTrade?.assetClass === "Options") {
      const draft = draftFromJournalTrade(initialTrade);
      setUnderlying(initialTrade.ticker);
      setListingMarket(
        initialTrade.listingMarket != null
          ? (normalizeListingMarket(initialTrade.listingMarket) as ListingMarketId)
          : defaultListingMarket
      );
      setStatus(initialTrade.status ?? "Closed");
      setTagsRaw(initialTrade.tags.join(", "));
      setEntryDate(isoToDateTimeFieldValue(initialTrade.entryDate));
      setExitDate(
        (initialTrade.status ?? "Closed") === "Active"
          ? isoToDateTimeFieldValue(initialTrade.entryDate)
          : isoToDateTimeFieldValue(initialTrade.exitDate)
      );
      setNotes(initialTrade.notes);
      setScreenshotSrc(initialTrade.screenshots[0] ?? "");
      if (draft) {
        setTemplateId(draft.templateId);
        setLegs(draft.legs);
        setContracts(draft.legs[0]?.quantity ?? 1);
        setMaxRisk(draft.maxRisk);
        setIvRank(draft.ivRank != null ? String(draft.ivRank) : "");
        setDeltaAtEntry(
          draft.deltaAtEntry != null ? String(draft.deltaAtEntry) : ""
        );
        setPayoff(draft.payoff);
        setSpot(draft.spotAtEntry);
        setExitSettings(
          draft.exitPlan
            ? {
                lossMultiple: draft.exitPlan.lossMultiple,
                debitStopPct: draft.exitPlan.debitStopPct,
                profitTargetPct: draft.exitPlan.profitTargetPct,
              }
            : DEFAULT_EXIT_PLAN_SETTINGS
        );
      }
      return;
    }

    setUnderlying("");
    setListingMarket(defaultListingMarket);
    setStatus("Active");
    setTemplateId("bull_put_spread");
    setLegs(legsFromTemplate("bull_put_spread"));
    setContracts(1);
    setMaxRisk(0);
    setIvRank("");
    setDeltaAtEntry("");
    setTagsRaw("");
    setEntryDate(currentDateTimeValue());
    setExitDate(currentDateTimeValue());
    setNotes("");
    setPayoff(undefined);
    setSpot(undefined);
    setExitSettings(DEFAULT_EXIT_PLAN_SETTINGS);
    setScreenshotSrc("");
    setFillProgress({ active: false, percent: 0, label: "" });
  }, [open, initialTrade, defaultListingMarket]);

  const applyTemplate = useCallback(
    (next: OptionsTemplateId) => {
      setTemplateId(next);
      setLegs(legsFromTemplate(next, contracts));
    },
    [contracts]
  );

  const updateLeg = useCallback(
    (id: string, patch: Partial<OptionsLegDraft>) => {
      setLegs((prev) =>
        prev.map((leg) => (leg.id === id ? { ...leg, ...patch } : leg))
      );
    },
    []
  );

  const setLots = useCallback((count: number | null) => {
    if (count == null || !Number.isFinite(count) || count <= 0) {
      setContracts(0);
      setLegs((prev) => prev.map((leg) => ({ ...leg, quantity: 0 })));
      return;
    }
    const next = Math.max(1, Math.floor(count));
    setContracts(next);
    setLegs((prev) => prev.map((leg) => ({ ...leg, quantity: next })));
  }, []);

  const netEntry = useMemo(() => netPremiumFromLegs(legs, "entry"), [legs]);
  const isCredit = netEntry >= 0;

  const sharesPerLot = useMemo(
    () => sharesPerOptionLot(underlying, listingMarket),
    [underlying, listingMarket]
  );

  const lotMultiplier = useMemo(() => {
    if (sharesPerLot) return sharesPerLot;
    if (!payoff || netEntry === 0) return undefined;
    const total = isCredit ? payoff.maxProfit : payoff.maxLoss;
    if (total == null || total <= 0) return undefined;
    return Math.abs(total) / Math.abs(netEntry);
  }, [sharesPerLot, payoff, netEntry, isCredit]);

  const exitPlan = useMemo(
    () =>
      spot
        ? buildExitPlan({
            legs,
            contracts,
            entryDate,
            spot,
            listingMarket,
            settings: exitSettings,
            multiplier: lotMultiplier,
          })
        : null,
    [legs, contracts, entryDate, spot, listingMarket, exitSettings, lotMultiplier]
  );

  const applyParsedScreenshot = useCallback(
    (parsed: ParsedOptionsScreenshot) => {
      const legCount = parsed.legs?.length ?? 0;
      const nextTemplate = normalizeTemplateId(parsed.templateId, legCount);
      const nextContracts = parsed.contracts ?? contracts;

      if (parsed.underlying?.trim()) {
        setUnderlying(parsed.underlying.trim().toUpperCase());
      }
      if (parsed.listingMarket) {
        setListingMarket(parsed.listingMarket);
      }
      if (parsed.status) {
        setStatus(parsed.status);
      }
      if (parsed.contracts != null) {
        setContracts(nextContracts);
      }
      if (parsed.maxRisk != null) {
        setMaxRisk(parsed.maxRisk);
      } else if (
        parsed.payoff?.maxLoss != null &&
        !parsed.payoff.maxLossUnlimited
      ) {
        setMaxRisk(Math.abs(parsed.payoff.maxLoss));
      }
      if (hasPayoffMetrics(parsed.payoff)) {
        setPayoff(parsed.payoff);
      }
      const derivedSpot = spotFromBreakeven(
        parsed.payoff?.breakevens,
        parsed.payoff?.breakevenPct
      );
      if (parsed.spotPrice != null && parsed.spotPrice > 0) {
        setSpot(parsed.spotPrice);
      } else if (derivedSpot != null) {
        setSpot(derivedSpot);
      }
      if (parsed.ivRank != null) {
        setIvRank(String(parsed.ivRank));
      }
      if (parsed.deltaAtEntry != null) {
        setDeltaAtEntry(String(parsed.deltaAtEntry));
      }
      if (parsed.entryDate?.trim()) {
        setEntryDate(isoToDateTimeFieldValue(parsed.entryDate));
      }
      if (parsed.exitDate?.trim() && parsed.status === "Closed") {
        setExitDate(isoToDateTimeFieldValue(parsed.exitDate));
      }
      if (parsed.tags?.length) {
        setTagsRaw(parsed.tags.join(", "));
      }
      if (parsed.notes?.trim()) {
        setNotes((prev) =>
          prev.trim() ? `${prev.trim()}\n\n${parsed.notes}` : parsed.notes!
        );
      }

      setTemplateId(nextTemplate);
      setLegs(mergeParsedLegs(nextTemplate, parsed.legs, nextContracts));
    },
    [contracts]
  );

  const runScreenshotFill = useCallback(
    async (imageDataUrl: string) => {
      prewarmEquitySymbolSearch();
      setScanning(true);
      setScanError(null);
      setFillProgress({
        active: true,
        percent: 0,
        label: screenshotFillProgressLabel(0, "analyzing"),
      });

      const reportParsedProgress = (
        parsed: ParsedOptionsScreenshot,
        underlyingVerified: boolean,
        phase: "applying" | "done" = "done"
      ) => {
        const percent = screenshotFillCompleteness(parsed, {
          underlyingVerified,
        });
        setFillProgress({
          active: true,
          percent,
          label: screenshotFillProgressLabel(percent, phase),
        });
      };

      try {
        const res = await fetch("/api/options/parse-screenshot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: imageDataUrl }),
        });
        const payload = (await res.json()) as {
          ok?: boolean;
          parsed?: ParsedOptionsScreenshot;
          error?: string;
        };
        if (!res.ok || !payload.parsed) {
          throw new Error(payload.error ?? "Could not read screenshot");
        }
        const parsed = payload.parsed;
        const market = parsed.listingMarket ?? listingMarket;

        applyParsedScreenshot(parsed);
        reportParsedProgress(parsed, false, "applying");

        const underlyingQuery = underlyingSearchTextFromParsed(parsed);
        let underlyingVerified = false;
        if (underlyingQuery) {
          setFillProgress((prev) => ({
            ...prev,
            label: screenshotFillProgressLabel(prev.percent, "applying"),
          }));
          try {
            const match = await resolveEquitySymbolForMarket(
              underlyingQuery,
              market
            );
            if (match) {
              underlyingVerified = true;
              setUnderlying(match.code);
              tickerRef.current?.applySymbol(
                match.code,
                formatTickerDisplayLabel(match.name, match.code)
              );
            } else {
              const fallback = normalizeEquityTicker(underlyingQuery);
              if (fallback) {
                setUnderlying(fallback);
                const committed =
                  await tickerRef.current?.commitQuery(underlyingQuery);
                underlyingVerified = committed !== false;
                if (committed === false) {
                  tickerRef.current?.applySymbol(fallback, fallback);
                }
              }
            }
          } catch {
            const fallback = normalizeEquityTicker(underlyingQuery);
            if (fallback) {
              underlyingVerified = true;
              setUnderlying(fallback);
              tickerRef.current?.applySymbol(fallback, fallback);
            }
          }
        } else {
          toast.message(
            "Could not read underlying from screenshot — enter the symbol."
          );
        }

        reportParsedProgress(parsed, underlyingVerified, "done");
        toast.success("Form filled from screenshot — review before saving.");
      } catch (error) {
        setFillProgress({ active: false, percent: 0, label: "" });
        const message =
          error instanceof Error ? error.message : "Screenshot scan failed";
        setScanError(message);
        toast.error(message);
      } finally {
        setScanning(false);
      }
    },
    [applyParsedScreenshot, listingMarket]
  );

  const applyScreenshotBlob = useCallback(
    async (blob: Blob) => {
      if (blob.size > MAX_SCREENSHOT_BYTES) {
        setUploadError("File must be 5 MB or smaller.");
        return;
      }
      try {
        const dataUrl = await imageBlobToVisionDataUrl(blob);
        setScreenshotSrc(dataUrl);
        setUploadError(null);
        if (fillFromScreenshot) {
          setFillProgress({
            active: true,
            percent: 0,
            label: screenshotFillProgressLabel(0, "analyzing"),
          });
          await runScreenshotFill(dataUrl);
        }
      } catch {
        setUploadError("Could not read image.");
      }
    },
    [fillFromScreenshot, runScreenshotFill]
  );

  const handleScreenshotFile = useCallback(
    (file: File | null) => {
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        setUploadError("Drop or choose a PNG, JPEG, or WebP image.");
        return;
      }
      void applyScreenshotBlob(file);
    },
    [applyScreenshotBlob]
  );

  const applyClipboardImage = useCallback(
    (data: DataTransfer | null) => {
      const file = data ? imageFileFromDataTransfer(data) : null;
      if (!file) return false;
      handleScreenshotFile(file);
      return true;
    },
    [handleScreenshotFile]
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

  function handleScreenshotZonePaste(
    event: React.ClipboardEvent<HTMLDivElement>
  ) {
    if (applyClipboardImage(event.clipboardData)) {
      event.preventDefault();
    }
  }

  function handleScreenshotDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
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
    event.stopPropagation();
    setScreenshotDragActive(false);
    const file = imageFileFromDataTransfer(event.dataTransfer);
    if (!file) {
      setUploadError("Drop an image file or screenshot.");
      return;
    }
    handleScreenshotFile(file);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    const committed = await tickerRef.current?.commit();
    if (committed === false) return;

    const resolved = normalizeEquityTicker(underlying);
    if (!resolved) {
      setFormError("Underlying symbol is required.");
      return;
    }

    if (legs.some((leg) => leg.quantity <= 0)) {
      setFormError("Enter the number of lots.");
      return;
    }

    if (legs.some((leg) => !leg.expiry)) {
      setFormError("Set an expiration date on every leg.");
      return;
    }

    if (legs.some((leg) => leg.entryPremium <= 0)) {
      setFormError("Enter the fill premium for each leg.");
      return;
    }

    if (status === "Closed" && legs.some((leg) => leg.exitPremium <= 0)) {
      setFormError("Enter closing premiums for closed positions.");
      return;
    }

    const tags = tagsRaw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const trade = buildJournalTradeFromOptionsForm({
      id: initialTrade?.id,
      underlying: resolved,
      listingMarket,
      status,
      templateId,
      legs,
      maxRisk,
      fees: initialTrade?.fees ?? 0,
      entryDate,
      exitDate: status === "Active" ? entryDate : exitDate,
      notes,
      tags,
      screenshots: screenshotSrc ? [screenshotSrc] : [],
      ivRank: ivRank ? Number(ivRank) : undefined,
      deltaAtEntry: deltaAtEntry ? Number(deltaAtEntry) : undefined,
      payoff,
      spotAtEntry: spot,
      exitPlan: exitPlan
        ? {
            ...exitSettings,
            premiumStop: exitPlan.premiumStop,
            profitTargetPrice: exitPlan.profitTargetPrice,
            underlyingStopBelow: exitPlan.checkpoints[0]?.below,
            underlyingStopAbove: exitPlan.checkpoints[0]?.above,
            timeStopDate: exitPlan.timeStop.date,
          }
        : undefined,
      sector: initialTrade?.sector,
      marketCapBucket: initialTrade?.marketCapBucket,
    });

    onSave(trade);
    onOpenChange(false);
  }

  const exitDisabled = status === "Active";
  const strategyName = template?.strategyName ?? "Options";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92dvh,880px)] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden rounded-xl border border-border bg-background p-0 shadow-2xl sm:w-[min(96vw,72rem)] sm:max-w-[min(96vw,72rem)]">
        <DialogHeader className="shrink-0 border-b border-border px-4 py-3 text-left sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-3 pr-8">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted/40 text-foreground">
                <Layers className="size-4" />
              </span>
              <div className="min-w-0">
                <p className={fieldLabelClass}>Options blotter</p>
                <DialogTitle className="text-base font-semibold tracking-tight">
                  {initialTrade ? "Edit position" : "New position"}
                </DialogTitle>
              </div>
            </div>
            <div
              className="inline-flex rounded-md border border-border bg-muted/30 p-0.5"
              role="group"
              aria-label="Position status"
            >
              {(
                [
                  ["Active", "Open"],
                  ["Closed", "Closed"],
                ] as const
              ).map(([value, label]) => {
                const active = status === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setStatus(value);
                      if (value === "Active") setExitDate(entryDate);
                    }}
                    className={cn(
                      "h-7 rounded-[5px] px-3 text-xs font-medium transition-colors",
                      active
                        ? value === "Active"
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "bg-rose-600 text-white shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <div
              role="region"
              aria-label="Screenshot upload"
              tabIndex={0}
              onPaste={handleScreenshotZonePaste}
              onDragEnter={handleScreenshotDragOver}
              onDragOver={handleScreenshotDragOver}
              onDragLeave={handleScreenshotDragLeave}
              onDrop={handleScreenshotDrop}
              className={cn(
                "shrink-0 border-b border-border bg-muted/20 px-4 py-2.5 outline-none sm:px-5",
                screenshotDragActive && "bg-muted/40"
              )}
            >
              <input
                id={screenshotInputId}
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/*"
                className="hidden"
                onChange={(e) => {
                  handleScreenshotFile(e.target.files?.[0] ?? null);
                  e.target.value = "";
                }}
              />
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <label className="inline-flex items-center gap-2 text-xs font-medium text-foreground">
                  <Checkbox
                    checked={fillFromScreenshot}
                    onCheckedChange={(checked) =>
                      setFillFromScreenshot(checked === true)
                    }
                  />
                  Auto-fill
                </label>
                <div className="flex flex-wrap items-center gap-1.5">
                  <label
                    htmlFor={screenshotInputId}
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "h-7 cursor-pointer gap-1.5 bg-background px-2.5 text-xs",
                      scanning && "pointer-events-none opacity-50"
                    )}
                  >
                    <Upload className="size-3.5" />
                    Upload
                  </label>
                  {screenshotSrc ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1.5 px-2.5 text-xs"
                      disabled={scanning}
                      onClick={() => void runScreenshotFill(screenshotSrc)}
                    >
                      {scanning ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="size-3.5" />
                      )}
                      {scanning ? "Reading" : "Re-scan"}
                    </Button>
                  ) : null}
                  {screenshotSrc ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 px-2 text-xs text-muted-foreground"
                      onClick={() => {
                        setScreenshotSrc("");
                        setScanError(null);
                        setFillProgress({
                          active: false,
                          percent: 0,
                          label: "",
                        });
                      }}
                    >
                      <X className="size-3.5" />
                      Remove
                    </Button>
                  ) : null}
                </div>
                <div className="min-w-[14rem] flex-1" aria-live="polite">
                  {fillProgress.active ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                          {scanning ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : null}
                          {fillProgress.label}
                        </span>
                        <span
                          className={cn(
                            "font-medium text-foreground",
                            NUMERIC_CLASS
                          )}
                        >
                          {fillProgress.percent}%
                        </span>
                      </div>
                      <Progress value={fillProgress.percent} className="gap-0">
                        <ProgressTrack className="h-1 bg-border">
                          <ProgressIndicator className="bg-foreground transition-all duration-300" />
                        </ProgressTrack>
                      </Progress>
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">
                      Drop, paste (⌘V), or upload a broker confirmation. Review
                      before saving.
                    </p>
                  )}
                </div>
                {screenshotSrc ? (
                  <ChartScreenshotPreview
                    src={screenshotSrc}
                    alt="Options chart"
                    wrapperClassName="h-12 w-24 shrink-0 rounded-md"
                    thumbnailClassName="h-12 w-full object-cover object-top"
                  />
                ) : null}
              </div>
              {uploadError ? (
                <p className="mt-2 text-xs text-rose-600">{uploadError}</p>
              ) : null}
              {scanError ? (
                <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">
                  {scanError}
                </p>
              ) : null}
            </div>

            <div className="grid min-h-0 lg:grid-cols-[minmax(0,1.55fr)_minmax(17.5rem,0.72fr)]">
              <div className="space-y-4 border-border px-4 py-4 sm:px-5 lg:border-r">
                <div className="space-y-3">
                  <PanelHeading title="Instrument" meta={strategyName} />
                  <div className="flex gap-1 overflow-x-auto rounded-md border border-border bg-muted/30 p-1">
                    {OPTIONS_LOG_TEMPLATES.map((item) => {
                      const active = item.id === templateId;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => applyTemplate(item.id)}
                          className={cn(
                            "h-7 shrink-0 rounded-[5px] px-2.5 text-xs font-medium whitespace-nowrap transition-colors",
                            active
                              ? "bg-background text-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {titleCaseWords(item.label)}
                        </button>
                      );
                    })}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_11rem]">
                    <div className="space-y-1.5">
                      <Label className={fieldLabelClass}>Underlying</Label>
                      <TickerSearchInput
                        ref={tickerRef}
                        value={underlying}
                        onChange={setUnderlying}
                        listingMarket={listingMarket}
                        className={cn(inputClass, "h-9 w-full rounded-md")}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className={fieldLabelClass}>Exchange</Label>
                      <Select
                        value={listingMarket}
                        onValueChange={(value) => {
                          if (
                            LISTING_MARKET_IDS.includes(value as ListingMarketId)
                          ) {
                            setListingMarket(value as ListingMarketId);
                          }
                        }}
                      >
                        <SelectTrigger className={cn(inputClass, "rounded-md")}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {EQUITY_LISTING_MARKETS.map((market) => (
                            <SelectItem key={market.id} value={market.id}>
                              {market.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full min-w-[40rem] border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                      <th className="w-8 px-2 py-2 text-center">#</th>
                      <th className="px-1.5 py-2 text-left font-medium">Side</th>
                      <th className="px-1.5 py-2 text-left font-medium">Type</th>
                      <th className="min-w-[6.5rem] px-1.5 py-2 text-left font-medium">
                        Lots
                      </th>
                      <th className="min-w-[5rem] px-1.5 py-2 text-left font-medium">
                        Strike
                      </th>
                      <th className="min-w-[7.5rem] px-1.5 py-2 text-left font-medium">
                        Expiry
                      </th>
                      <th className="min-w-[5.5rem] px-1.5 py-2 text-left font-medium">
                        Entry Premium
                      </th>
                      <th className="min-w-[5.5rem] px-1.5 py-2 text-left font-medium">
                        Close Premium
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {legs.map((leg, index) => (
                      <tr
                        key={leg.id}
                        className="border-b border-border/70 last:border-0"
                      >
                        <td className="px-2 py-1 text-center text-[11px] text-muted-foreground">
                          {index + 1}
                        </td>
                        <td className="p-1">
                          <Select
                            value={leg.side}
                            onValueChange={(v) =>
                              v &&
                              updateLeg(leg.id, {
                                side: v as OptionsLegDraft["side"],
                              })
                            }
                          >
                            <SelectTrigger className={compactSelectClass}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Long">Long</SelectItem>
                              <SelectItem value="Short">Short</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-1">
                          <Select
                            value={leg.optionType}
                            onValueChange={(v) =>
                              v &&
                              updateLeg(leg.id, {
                                optionType: v as OptionsLegDraft["optionType"],
                              })
                            }
                          >
                            <SelectTrigger className={compactSelectClass}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Call">Call</SelectItem>
                              <SelectItem value="Put">Put</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-1">
                          <div className="flex items-center gap-1">
                            <NumericInput
                              className={cn(compactInputClass, "w-14")}
                              value={leg.quantity > 0 ? leg.quantity : null}
                              onValueChange={setLots}
                              aria-label="Lots"
                            />
                            {sharesPerLot ? (
                              <span
                                className={cn(
                                  "shrink-0 text-[11px] text-muted-foreground",
                                  NUMERIC_CLASS
                                )}
                                title={`${sharesPerLot.toLocaleString("en-IN")} stocks in one lot`}
                              >
                                ({sharesPerLot.toLocaleString("en-IN")})
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="p-1">
                          <NumericInput
                            className={compactInputClass}
                            value={leg.strike > 0 ? leg.strike : null}
                            onValueChange={(next) =>
                              updateLeg(leg.id, { strike: next ?? 0 })
                            }
                            aria-label="Strike"
                          />
                        </td>
                        <td className="p-1">
                          <ExpiryField
                            tableCell
                            value={leg.expiry}
                            onChange={(ymd) =>
                              updateLeg(leg.id, { expiry: ymd })
                            }
                          />
                        </td>
                        <td className="p-1">
                          <NumericInput
                            className={compactInputClass}
                            value={
                              leg.entryPremium > 0 ? leg.entryPremium : null
                            }
                            onValueChange={(next) =>
                              updateLeg(leg.id, { entryPremium: next ?? 0 })
                            }
                            aria-label="Premium"
                          />
                        </td>
                        <td className="p-1">
                          <NumericInput
                            disabled={exitDisabled}
                            className={cn(
                              compactInputClass,
                              exitDisabled && "opacity-50"
                            )}
                            value={leg.exitPremium > 0 ? leg.exitPremium : null}
                            onValueChange={(next) =>
                              updateLeg(leg.id, { exitPremium: next ?? 0 })
                            }
                            aria-label="Close premium"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {hasPayoffMetrics(payoff) ? (
                <OptionsPayoffSummary payoff={payoff} />
              ) : null}
              <OptionsExitPlan
                plan={exitPlan}
                settings={exitSettings}
                onSettingsChange={setExitSettings}
                spot={spot}
                onSpotChange={setSpot}
                isCredit={isCredit}
                currency={activeCurrency}
                underlying={underlying}
              />
                </div>
              </div>

              <aside className="space-y-4 bg-muted/15 px-4 py-4 sm:px-5">
                <PanelHeading title="Risk" meta={activeCurrency} />
                <div className="space-y-1.5">
                  <Label className={fieldLabelClass}>Max risk</Label>
                  <NumericInput
                    className={cn(numberInputClass, "rounded-md")}
                    value={maxRisk > 0 ? maxRisk : null}
                    onValueChange={(next) => setMaxRisk(next ?? 0)}
                    placeholder="0.00"
                    aria-label="Max risk"
                  />
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <DateTimeField
                    label="Opened"
                    value={entryDate}
                    onChange={setEntryDate}
                  />
                  <DateTimeField
                    label="Closed"
                    value={exitDate}
                    onChange={setExitDate}
                    disabled={exitDisabled}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className={fieldLabelClass}>Notes</Label>
                  <Textarea
                    rows={6}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Entry thesis, roll plan, post-trade review"
                    className="min-h-[8.5rem] resize-y rounded-md border-border bg-background text-sm shadow-none"
                  />
                </div>
              </aside>
            </div>

            {formError ? (
              <p className="mx-4 mb-4 rounded-md border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-xs text-rose-700 sm:mx-5 dark:text-rose-300">
                {formError}
              </p>
            ) : null}
          </div>

          <DialogFooter className="m-0 shrink-0 border-t border-border bg-background px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p className="text-[11px] text-muted-foreground">
              {isCredit ? "Credit" : "Debit"}{" "}
              <span className={cn("font-medium text-foreground", NUMERIC_CLASS)}>
                {Math.abs(netEntry).toFixed(2)}
              </span>
              <span className="mx-2 text-border">·</span>
              {contracts} contract{contracts === 1 ? "" : "s"}
              <span className="mx-2 text-border">·</span>
              {status === "Active" ? "Open" : "Closed"}
            </p>
            <div className="flex w-full gap-2 sm:w-auto">
              <Button
                type="button"
                variant="outline"
                className="h-8 flex-1 sm:flex-none"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-8 flex-1 bg-foreground text-background hover:bg-foreground/90 sm:flex-none"
              >
                Save position
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
