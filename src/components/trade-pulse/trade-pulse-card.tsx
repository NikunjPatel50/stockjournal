import { format, parseISO } from "date-fns";
import {
  Activity,
  Layers3,
  Newspaper,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import type { TradePulseNoteDto } from "@/app/api/trade-pulse/route";
import type { TradePulseSignal } from "@/lib/trade-pulse/anomaly-types";
import { cn } from "@/lib/utils";

const pulseAccentClass =
  "text-emerald-600 dark:text-emerald-400";
const pulseBadgeClass =
  "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";

function signalMeta(signal: TradePulseSignal): {
  label: string;
  Icon: LucideIcon;
} {
  switch (signal) {
    case "volume":
      return { label: "Volume anomaly", Icon: Activity };
    case "price":
      return { label: "Price move", Icon: TrendingUp };
    case "news":
      return { label: "News-driven", Icon: Newspaper };
    case "mixed":
    default:
      return { label: "Mixed signals", Icon: Layers3 };
  }
}

function formatGeneratedAt(value: string): string {
  const parsed = parseISO(value);
  if (Number.isNaN(parsed.getTime())) return "Today";
  return format(parsed, "h:mm a · MMM d");
}

export function TradePulseCard({ note }: { note: TradePulseNoteDto }) {
  const { label, Icon } = signalMeta(note.primarySignal);

  return (
    <article className="flex min-w-0 flex-col rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className={cn(
              "text-[10px] font-semibold uppercase tracking-[0.14em] opacity-80",
              pulseAccentClass
            )}
          >
            Trade Pulse
          </p>
          <h3 className="mt-1 truncate text-base font-semibold tracking-tight text-foreground">
            {note.ticker}
          </h3>
        </div>

        <div
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.08em]",
            pulseBadgeClass
          )}
          title={label}
        >
          <Icon className="size-3.5" aria-hidden />
          <span>{label}</span>
        </div>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-foreground/90">
        {note.note}
      </p>

      <p className="mt-4 text-[11px] text-muted-foreground">
        {formatGeneratedAt(note.generatedAt)}
      </p>
    </article>
  );
}
