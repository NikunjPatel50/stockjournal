import { cn } from "@/lib/utils";

export type LandingScreenshotVariant =
  | "dashboard"
  | "journal"
  | "analytics"
  | "calendar";

export const LANDING_SCREENSHOT_DISPLAY_WIDTH = 1600;

/** Static app screenshots — 2x captures, displayed at 1x CSS width for retina clarity. */
const SCREENSHOT_META: Record<
  LandingScreenshotVariant,
  { src: string; alt: string; width: number; height: number; displayWidth: number }
> = {
  dashboard: {
    src: "/landing/app-dashboard.png",
    width: 3200,
    height: 1640,
    displayWidth: LANDING_SCREENSHOT_DISPLAY_WIDTH,
    alt: "SwingTradingLog dashboard with live portfolio KPIs, Trade Pulse, and performance charts",
  },
  journal: {
    src: "/landing/app-journal.png",
    width: 3200,
    height: 1640,
    displayWidth: LANDING_SCREENSHOT_DISPLAY_WIDTH,
    alt: "SwingTradingLog trade journal with filters, summary stats, and active trade log",
  },
  analytics: {
    src: "/landing/app-analytics.png",
    width: 3200,
    height: 1640,
    displayWidth: LANDING_SCREENSHOT_DISPLAY_WIDTH,
    alt: "SwingTradingLog analytics with sector attribution, P&L charts, and risk metrics",
  },
  calendar: {
    src: "/landing/app-calendar.png",
    width: 3200,
    height: 1640,
    displayWidth: LANDING_SCREENSHOT_DISPLAY_WIDTH,
    alt: "SwingTradingLog P&L calendar with daily and monthly performance",
  },
};

export function AppScreenshot({
  variant = "dashboard",
  className,
  priority = false,
}: {
  variant?: LandingScreenshotVariant;
  className?: string;
  priority?: boolean;
}) {
  const meta = SCREENSHOT_META[variant];

  return (
    <div
      className={cn(
        "mx-auto w-full overflow-hidden rounded-xl border border-border/80 bg-card shadow-xl shadow-black/5 dark:shadow-black/30",
        className
      )}
      style={{ maxWidth: meta.displayWidth }}
      role="img"
      aria-label={meta.alt}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={meta.src}
        alt={meta.alt}
        width={meta.displayWidth}
        height={Math.round(meta.height * (meta.displayWidth / meta.width))}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        className="h-auto w-full bg-background"
      />
    </div>
  );
}
