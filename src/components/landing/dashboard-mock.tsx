import { Fragment, type ReactNode } from "react";
import {
  ArrowDown,
  BarChart3,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Copy,
  LayoutDashboard,
  MessageSquare,
  Pencil,
  Settings,
  Target,
  Trash2,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { cn, NUMERIC_CLASS } from "@/lib/utils";

const equityPoints =
  "0,72 36,68 72,62 108,58 144,48 180,52 216,40 252,44 288,28 324,32 360,18 396,22 432,12";

const mockShell =
  "overflow-hidden rounded-xl border border-border bg-card shadow-xl shadow-black/5 dark:shadow-black/30";
const mockChrome =
  "flex items-center gap-2 border-b border-border bg-muted/60 px-3 py-2.5 sm:px-4";
const mockDot = "size-2.5 rounded-full bg-muted-foreground/30";
const mockUrlBar =
  "ml-2 flex-1 truncate rounded-md border border-border bg-background px-2.5 py-1 text-[10px] text-muted-foreground sm:ml-3 sm:text-[11px]";
const mockCard =
  "rounded-xl border border-border bg-card p-3 shadow-sm ring-1 ring-foreground/[0.04] dark:ring-white/[0.06]";
const mockLabel = "text-[10px] font-medium uppercase tracking-wide text-muted-foreground";
const mockMuted = "text-xs text-muted-foreground";
const mockValue = cn("text-foreground", NUMERIC_CLASS);
const mockPositive = cn("text-emerald-600 dark:text-emerald-400", NUMERIC_CLASS);
const mockNegative = cn("text-rose-600 dark:text-rose-400", NUMERIC_CLASS);

const SIDEBAR_NAV = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Analytics", icon: BarChart3 },
  { label: "Journal", icon: BookOpen },
  { label: "Goals", icon: Target },
  { label: "Settings", icon: Settings },
  { label: "Feedback", icon: MessageSquare },
] as const;

type MockVariant = "dashboard" | "journal" | "analytics" | "goals";

function mockPath(variant: MockVariant) {
  if (variant === "journal") return "journal";
  if (variant === "analytics") return "analytics";
  if (variant === "goals") return "goals";
  return "dashboard";
}

function activeNavLabel(variant: MockVariant) {
  if (variant === "journal") return "Journal";
  if (variant === "analytics") return "Analytics";
  if (variant === "goals") return "Goals";
  return "Dashboard";
}

function MockSidebar({ variant }: { variant: MockVariant }) {
  const active = activeNavLabel(variant);

  return (
    <aside className="hidden w-[9.5rem] shrink-0 border-r border-sidebar-border bg-sidebar sm:flex sm:w-[10.5rem] sm:flex-col">
      <div className="border-b border-sidebar-border px-2 py-3 sm:px-3 sm:py-4">
        <BrandLogo
          lockup
          size="sm"
          lockupHeight={56}
          framedMark={false}
          showWordmark={false}
          logoTheme="auto"
        />
      </div>
      <div className="flex flex-1 flex-col px-2 py-3 sm:px-2.5">
        <nav className="space-y-0.5">
          {SIDEBAR_NAV.map((item) => {
            const Icon = item.icon;
            const isActive = item.label === active;
            return (
              <div
                key={item.label}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-medium",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                    : "text-muted-foreground"
                )}
              >
                <Icon className="size-3.5 shrink-0 opacity-80" aria-hidden />
                <span className="truncate">{item.label}</span>
              </div>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

export function DashboardMock({
  variant = "dashboard",
  className,
  previewLabel,
  compact = false,
}: {
  variant?: MockVariant;
  className?: string;
  previewLabel?: string;
  compact?: boolean;
}) {
  const variantLabels: Record<MockVariant, string> = {
    dashboard:
      "Trading journal dashboard with KPIs, Trade Pulse, overnight gap exposure, and equity curve",
    journal:
      "Trade journal with filters, summary stats, active trade log, and expandable row details",
    analytics:
      "Trading analytics with sector and market-cap attribution, P&L calendar, and risk metrics",
    goals: "Trading goals and discipline progress tracking",
  };

  return (
    <div
      className={cn(mockShell, "min-w-0", className)}
      role="img"
      aria-label={previewLabel ?? variantLabels[variant]}
    >
      <div className={mockChrome}>
        <span className={mockDot} />
        <span className={mockDot} />
        <span className={mockDot} />
        <div className={mockUrlBar}>
          swingtradinglog.com/{mockPath(variant)}
        </div>
      </div>

      <div
        className={cn(
          "flex",
          compact
            ? "min-h-[240px] sm:min-h-[260px]"
            : variant === "analytics"
              ? "min-h-[360px] sm:min-h-[420px]"
              : variant === "journal"
                ? "min-h-[420px] sm:min-h-[520px]"
                : "min-h-[280px] sm:min-h-[340px]"
        )}
      >
        <MockSidebar variant={variant} />
        <div className="min-w-0 flex-1 space-y-3 bg-background p-3 sm:p-4">
          {variant === "dashboard" && <DashboardPreview compact={compact} />}
          {variant === "journal" && <JournalPreview compact={compact} />}
          {variant === "analytics" && <AnalyticsPreview />}
          {variant === "goals" && <GoalsPreview />}
        </div>
      </div>
    </div>
  );
}

function PageTitleMock({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
          {title}
        </h2>
        {description ? (
          <p className={cn("mt-0.5", mockMuted)}>{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

function ReportingPeriodMock() {
  const periods = [
    "Today",
    "Yesterday",
    "3D",
    "7D",
    "30D",
    "3M",
    "YTD",
    "All",
  ];

  return (
    <div className="rounded-lg border border-border bg-card p-2 shadow-sm ring-1 ring-foreground/[0.04]">
      <div className="overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max min-w-full flex-nowrap items-center gap-0.5 rounded-md bg-muted/50 p-0.5 ring-1 ring-border/50">
        {periods.map((label) => (
          <div
            key={label}
            className={cn(
              "shrink-0 rounded px-1.5 py-1 text-[9px] font-medium sm:px-2 sm:text-[10px]",
              label === "YTD"
                ? "bg-background font-semibold text-foreground shadow-sm"
                : "text-muted-foreground"
            )}
          >
            {label}
          </div>
        ))}
        </div>
      </div>
    </div>
  );
}

function OvernightExposureMock() {
  return (
    <div className={cn(mockCard, "h-full")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-semibold text-foreground">
          Overnight / weekend exposure
        </p>
        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[9px] font-semibold text-amber-800 dark:text-amber-300">
          Weekend risk
        </span>
      </div>
      <p className={cn("mt-1 text-center text-sm font-semibold", mockValue)}>
        ₹1,42,800 exposed (18% of account)
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full w-[18%] rounded-full bg-foreground/45" />
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-2 text-[10px] text-muted-foreground">
        <span className="font-mono font-medium text-foreground">RELIANCE</span>
        <span>50 @ ₹2,840</span>
        <span className={mockPositive}>₹1,42,000</span>
      </div>
    </div>
  );
}

function TradePulseMock() {
  return (
    <div className={mockCard}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold text-foreground">Trade Pulse</p>
          <p className="text-[10px] text-muted-foreground">
            Daily notes on open positions
          </p>
        </div>
        <span className="rounded-md border border-border/70 bg-muted/40 px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
          2 updates
        </span>
      </div>
      <div className="mt-2 space-y-1.5">
        <div className="rounded-lg border border-border/80 bg-muted/20 px-2.5 py-2">
          <p className={cn("text-[10px] font-semibold", mockValue)}>RELIANCE</p>
          <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">
            +1.8% since prior close · holding above 20-DMA
          </p>
        </div>
        <div className="rounded-lg border border-border/80 bg-muted/20 px-2.5 py-2">
          <p className={cn("text-[10px] font-semibold", mockValue)}>TCS</p>
          <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">
            Flat ahead of results · support near ₹3,920
          </p>
        </div>
      </div>
    </div>
  );
}

function MetricStripMock() {
  const items = [
    {
      label: "Net realized P&L",
      value: "+₹12,480",
      detail: "75 closed trades",
      tone: mockPositive,
    },
    {
      label: "Return on capital",
      value: "+12.4%",
      detail: "Base ₹1,00,000",
      tone: mockPositive,
    },
    {
      label: "Win rate",
      value: "64.2%",
      detail: "48W · 27L",
      tone: mockPositive,
    },
    {
      label: "Profit factor",
      value: "1.87",
      detail: "Gross ₹21.4k / ₹11.2k",
      tone: mockValue,
    },
    {
      label: "Expectancy",
      value: "+₹166",
      detail: "Expected value per trade",
      tone: mockPositive,
    },
    {
      label: "Max drawdown",
      value: "-₹1,240",
      detail: "3.8% peak-to-trough",
      tone: mockNegative,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border/80 bg-border/70 shadow-sm ring-1 ring-foreground/[0.04] sm:grid-cols-3 xl:grid-cols-6">
      {items.map((item) => (
        <div
          key={item.label}
          className="min-w-0 bg-card px-3 py-3 text-center sm:px-4"
        >
          <p className="truncate text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            {item.label}
          </p>
          <p className={cn("mt-1 truncate text-sm font-semibold", item.tone)}>
            {item.value}
          </p>
          <p className="mt-1 truncate text-[10px] text-muted-foreground">
            {item.detail}
          </p>
        </div>
      ))}
    </div>
  );
}

function PieChartMock({
  title,
  subtitle,
  slices,
}: {
  title: string;
  subtitle: string;
  slices: { label: string; value: number; color: string }[];
}) {
  let offset = 0;
  const total = slices.reduce((sum, slice) => sum + slice.value, 0) || 1;

  return (
    <div className={cn(mockCard, "h-full")}>
      <p className="text-[11px] font-semibold text-foreground">{title}</p>
      <p className="mt-0.5 text-[10px] text-muted-foreground">{subtitle}</p>
      <div className="mt-3 flex items-center gap-3">
        <div className="relative mx-auto size-20 shrink-0">
          <svg viewBox="0 0 36 36" className="size-full -rotate-90">
            <circle
              cx="18"
              cy="18"
              r="14"
              fill="none"
              className="stroke-muted/40"
              strokeWidth="5"
            />
            {slices.map((slice) => {
              const dash = (slice.value / total) * 88;
              const circle = (
                <circle
                  key={slice.label}
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke={slice.color}
                  strokeWidth="5"
                  strokeDasharray={`${dash} 88`}
                  strokeDashoffset={-offset}
                />
              );
              offset += dash;
              return circle;
            })}
          </svg>
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          {slices.map((slice) => (
            <div
              key={slice.label}
              className="flex items-center justify-between gap-2 text-[10px]"
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: slice.color }}
                />
                <span className="truncate text-muted-foreground">
                  {slice.label}
                </span>
              </span>
              <span className={cn("shrink-0 font-medium", mockValue)}>
                {slice.value}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PnlLineChartMock() {
  const points = [0, -4, 2, 8, 5, 12, 9, 16, 14, 20];
  const width = 100;
  const height = 40;
  const max = Math.max(...points);
  const min = Math.min(...points, 0);
  const span = Math.max(max - min, 1);
  const coords = points
    .map((value, index) => {
      const x = (index / (points.length - 1)) * width;
      const y = height - ((value - min) / span) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className={cn(mockCard, "h-full")}>
      <p className="text-[11px] font-semibold text-foreground">P&L line chart</p>
      <p className="mt-0.5 text-[10px] text-muted-foreground">
        Cumulative realized P&L from closed trades
      </p>
      <div className="mt-3 rounded-lg border border-border/70 bg-muted/15 p-3">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-20 w-full"
          aria-hidden
        >
          <polyline
            fill="none"
            stroke="#10b981"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={coords}
          />
        </svg>
      </div>
    </div>
  );
}

function KpiCardMock({
  title,
  value,
  footer,
  tone,
}: {
  title: string;
  value: string;
  footer: string;
  tone: string;
}) {
  return (
    <div
      className={cn(
        mockCard,
        "min-h-[4.5rem] bg-gradient-to-b from-card to-muted/40 px-2.5 py-2 text-center sm:min-h-[5rem]"
      )}
    >
      <p className="truncate text-[9px] font-medium text-muted-foreground sm:text-[10px]">
        {title}
      </p>
      <p className={cn("mt-1 truncate text-sm font-semibold sm:text-base", tone)}>
        {value}
      </p>
      <p className="mt-1 truncate border-t border-border pt-1 text-[9px] text-muted-foreground">
        {footer}
      </p>
    </div>
  );
}

function DashboardPreview({ compact = false }: { compact?: boolean }) {
  const kpis = [
    {
      title: "Net realized P&L",
      value: "+₹12,480",
      footer: "Return +12.4%",
      tone: mockPositive,
    },
    {
      title: "Profit factor",
      value: "1.87",
      footer: "Gross +₹21.4k",
      tone: mockValue,
    },
    {
      title: "Win rate",
      value: "64.2%",
      footer: "48W · 27L",
      tone: mockPositive,
    },
    {
      title: "Average R:R",
      value: "1:2.1",
      footer: "75 closed",
      tone: mockValue,
    },
    {
      title: "Max drawdown",
      value: "-₹1,240",
      footer: "-3.8%",
      tone: mockNegative,
    },
  ];

  return (
    <>
      <PageTitleMock
        title="Dashboard"
        description="Portfolio performance and execution analytics"
      />
      <ReportingPeriodMock />

      <div className="grid grid-cols-2 gap-1.5 min-[420px]:grid-cols-3 sm:grid-cols-5">
        {kpis.map((kpi) => (
          <KpiCardMock key={kpi.title} {...kpi} />
        ))}
      </div>

      {!compact ? <TradePulseMock /> : null}

      <div className="grid gap-2 lg:grid-cols-2">
        <OvernightExposureMock />
        <div className={mockCard}>
          <p className="text-[11px] font-semibold text-foreground">
            Monthly performance
          </p>
          <p className={cn("mt-0.5 text-center text-[10px]", mockMuted)}>
            YTD · closed trades
          </p>
          <div className="mt-3 flex h-16 items-end gap-1">
            {[35, 52, 28, 61, 44, 72].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-sm bg-emerald-500/80 dark:bg-emerald-400/80"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
      </div>

      {!compact ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <div className={mockCard}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold text-foreground">
                Performance overview
              </p>
              <div className="flex gap-1">
                {["Equity", "Weekly"].map((tab, i) => (
                  <span
                    key={tab}
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[9px] font-medium",
                      i === 0
                        ? "bg-muted font-semibold text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {tab}
                  </span>
                ))}
              </div>
            </div>
            <svg viewBox="0 0 440 90" className="h-20 w-full">
              <defs>
                <linearGradient id="eq" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
                </linearGradient>
              </defs>
              <polyline
                fill="url(#eq)"
                stroke="none"
                points={`0,90 ${equityPoints} 440,90`}
              />
              <polyline
                fill="none"
                stroke="#34d399"
                strokeWidth="2"
                points={equityPoints}
              />
            </svg>
          </div>

          <div className={mockCard}>
            <p className="text-[11px] font-semibold text-foreground">
              P&L Breakdown
            </p>
            <p className={cn("mt-0.5 text-center", mockMuted)}>Outcome split · YTD</p>
            <div className="mt-3 rounded-lg border border-border bg-muted/30 p-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="text-center sm:text-left">
                  <p className="text-xl font-bold tracking-tight text-foreground">
                    64.2%
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Win rate · by trades
                  </p>
                </div>
                <div className="text-right">
                  <p className={mockLabel}>Net P&L</p>
                  <p className={cn("text-xs font-semibold", mockPositive)}>
                    +₹12,480
                  </p>
                </div>
              </div>
              <div className="mt-2.5 flex h-2.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full w-[64%] bg-emerald-600 dark:bg-emerald-500" />
                <div className="h-full w-[36%] bg-rose-600 dark:bg-rose-500" />
              </div>
              <div className="mt-1.5 flex justify-between text-[10px] font-semibold">
                <span className={mockPositive}>Wins 64%</span>
                <span className={mockNegative}>Losses 36%</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function JournalHeaderMock() {
  return (
    <div className="space-y-2.5">
      <div>
        <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Execution log
        </p>
        <h2 className="text-sm font-semibold tracking-tight text-foreground sm:text-base">
          Trade journal
        </h2>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="space-y-2 p-2.5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="h-7 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-[10px] leading-7 text-muted-foreground">
              Search ticker, notes, tags…
            </div>
            <span className="inline-flex h-7 items-center rounded-md border border-border bg-background px-2 text-[10px] text-muted-foreground">
              All statuses
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-0.5 overflow-x-auto rounded-md bg-muted/50 p-0.5">
              {["Today", "7D", "30D", "YTD", "All"].map((period) => (
                <span
                  key={period}
                  className={cn(
                    "shrink-0 rounded px-1.5 py-0.5 text-[9px] font-medium",
                    period === "YTD"
                      ? "bg-background font-semibold text-foreground shadow-sm"
                      : "text-muted-foreground"
                  )}
                >
                  {period}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="hidden rounded-md border border-border px-2 py-1 text-[9px] text-muted-foreground sm:inline">
                Export
              </span>
              <span className="hidden rounded-md border border-border px-2 py-1 text-[9px] text-muted-foreground sm:inline">
                Import
              </span>
              <span className="rounded-md bg-emerald-500 px-2 py-1 text-[10px] font-semibold text-zinc-950">
                Log trade
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function JournalSummaryBarMock({ compact = false }: { compact?: boolean }) {
  const stats = compact
    ? [
        {
          label: "Daily P/L",
          value: "+₹5,650",
          accent: "border-t-emerald-500",
          valueClass: mockPositive,
        },
        {
          label: "Total P/L",
          value: "+₹6,815",
          accent: "border-t-emerald-500",
          valueClass: mockPositive,
        },
        {
          label: "Win rate",
          value: "75.0%",
          accent: "border-t-border",
          valueClass: mockValue,
        },
        {
          label: "Total loss",
          value: "-₹1,175",
          accent: "border-t-rose-500",
          valueClass: mockNegative,
        },
      ]
    : [
        {
          label: "Daily P/L",
          value: "+₹5,650",
          accent: "border-t-emerald-500",
          valueClass: mockPositive,
        },
        {
          label: "Total P/L",
          value: "+₹6,815",
          accent: "border-t-emerald-500",
          valueClass: mockPositive,
        },
        {
          label: "Win rate",
          value: "75.0%",
          accent: "border-t-border",
          valueClass: mockValue,
        },
        {
          label: "Accuracy %",
          value: "75.0%",
          accent: "border-t-emerald-500",
          valueClass: mockPositive,
        },
        {
          label: "Total invested",
          value: "₹8.42L",
          sub: "2 trades",
          accent: "border-t-border",
          valueClass: mockValue,
        },
        {
          label: "Total win",
          value: "₹7,990",
          sub: "3 trades",
          accent: "border-t-emerald-500",
          valueClass: mockPositive,
        },
        {
          label: "Total loss",
          value: "-₹1,175",
          sub: "1 trade",
          accent: "border-t-rose-500",
          valueClass: mockNegative,
        },
      ];

  return (
    <div
      className={cn(
        "grid gap-1.5",
        compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4 lg:grid-cols-7"
      )}
    >
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={cn(
            "min-h-[3.75rem] rounded-lg border border-border border-t-2 bg-card px-2 py-2 text-center sm:px-3 sm:py-2.5",
            stat.accent
          )}
        >
          <p className="text-[9px] font-medium text-muted-foreground sm:text-[10px]">
            {stat.label}
          </p>
          <p className={cn("mt-1 text-xs font-semibold sm:text-sm", stat.valueClass)}>
            {stat.value}
          </p>
          {"sub" in stat && stat.sub ? (
            <p className="mt-0.5 text-[9px] text-muted-foreground">{stat.sub}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function MockStatusBadge({ status }: { status: "Active" | "Closed" }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-1.5 py-0.5 text-[9px] font-medium",
        status === "Active"
          ? "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300"
          : "border-border bg-muted/50 text-muted-foreground"
      )}
    >
      {status}
    </span>
  );
}

function MockOutcomeBadge({
  outcome,
}: {
  outcome: "Win" | "Loss" | "Open";
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-1.5 py-0.5 text-[9px] font-medium",
        outcome === "Win" && "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        outcome === "Loss" && "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
        outcome === "Open" && "border-border bg-muted/50 text-muted-foreground"
      )}
    >
      {outcome === "Open" ? "Open" : outcome}
    </span>
  );
}

function MockMarketCell({
  price,
  changePct,
}: {
  price: string;
  changePct: number;
}) {
  if (price === "—") {
    return <span className="text-muted-foreground">—</span>;
  }

  const changeUp = changePct > 0;
  const changeDown = changePct < 0;
  return (
    <span className={cn("whitespace-nowrap font-semibold", mockValue)}>
      {price}{" "}
      <span
        className={cn(
          "text-[9px] font-medium",
          changeUp && mockPositive,
          changeDown && mockNegative,
          !changeUp && !changeDown && "text-muted-foreground"
        )}
      >
        ({changePct >= 0 ? "+" : ""}
        {changePct.toFixed(2)}%)
      </span>
    </span>
  );
}

function MockTargetStopBar({
  label,
  towardTarget = true,
  markerPosition = 62,
}: {
  label: string;
  towardTarget?: boolean;
  markerPosition?: number;
}) {
  return (
    <div className="mx-auto w-full max-w-[5.5rem] space-y-0.5">
      <div className="relative h-2 overflow-hidden rounded-full bg-muted/80 ring-1 ring-border/50">
        <div className="absolute inset-0 bg-gradient-to-r from-rose-500/50 to-emerald-500/50" />
        <div
          className="absolute top-1/2 z-10 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-foreground shadow-sm"
          style={{ left: `${markerPosition}%` }}
        />
      </div>
      <p
        className={cn(
          "text-center text-[9px] font-semibold leading-none",
          towardTarget ? mockPositive : mockNegative
        )}
      >
        {label}
      </p>
    </div>
  );
}

function MockTradeActions() {
  const iconClass = "size-3 text-muted-foreground";
  return (
    <div className="flex items-center justify-center gap-0.5">
      <span className="inline-flex size-6 items-center justify-center rounded-md hover:bg-muted/70">
        <Pencil className={iconClass} aria-hidden />
      </span>
      <span className="inline-flex size-6 items-center justify-center rounded-md hover:bg-muted/70">
        <Copy className={iconClass} aria-hidden />
      </span>
      <span className="inline-flex size-6 items-center justify-center rounded-md text-rose-500 hover:bg-rose-500/10">
        <Trash2 className={iconClass} aria-hidden />
      </span>
    </div>
  );
}

function MockRowAccordionDetails({
  status,
  outcome,
  profitTarget,
  profitTargetPct,
  stopLoss,
  stopLossPct,
  maxProfit,
  maxLoss,
  earnings,
  earningsEstimated = true,
}: {
  status: "Active" | "Closed";
  outcome: "Win" | "Loss" | "Open";
  profitTarget: string;
  profitTargetPct: string;
  stopLoss: string;
  stopLossPct: string;
  maxProfit: string;
  maxLoss: string;
  earnings: string;
  earningsEstimated?: boolean;
}) {
  const fields = [
    {
      label: "Status",
      value: <MockStatusBadge status={status} />,
    },
    {
      label: "Outcome",
      value: <MockOutcomeBadge outcome={outcome} />,
    },
    {
      label: "Profit target / Stop loss",
      value: (
        <span className={cn("whitespace-nowrap text-[10px] font-medium", mockValue)}>
          <span className={mockPositive}>
            {profitTarget}
            <span className="text-[9px]"> ({profitTargetPct})</span>
          </span>
          <span className="text-muted-foreground"> / </span>
          <span className={mockNegative}>
            {stopLoss}
            <span className="text-[9px]"> ({stopLossPct})</span>
          </span>
        </span>
      ),
    },
    {
      label: "Max profit / Max loss",
      value: (
        <span className={cn("whitespace-nowrap text-[10px] font-medium", mockValue)}>
          <span className={mockPositive}>{maxProfit}</span>
          <span className="text-muted-foreground"> / </span>
          <span className={mockNegative}>{maxLoss}</span>
        </span>
      ),
    },
    {
      label: "Next earnings date",
      value: (
        <div>
          <p className={cn("text-[10px] font-medium", mockValue)}>{earnings}</p>
          {earningsEstimated ? (
            <p className="mt-0.5 text-[9px] text-muted-foreground">Estimated</p>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className="overflow-hidden rounded-lg border border-border/80 bg-card shadow-sm ring-1 ring-foreground/[0.03]">
      <div className="border-b border-border/60 bg-muted/35 px-3 py-1.5">
        <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Trade details
        </span>
      </div>
      <div className="grid grid-cols-2 divide-y divide-border/50 sm:grid-cols-3 lg:grid-cols-5 lg:divide-y-0">
        {fields.map((field) => (
          <div
            key={field.label}
            className="border-border/50 px-3 py-2 text-center lg:border-r lg:last:border-r-0"
          >
            <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
              {field.label}
            </p>
            <div className="mt-1 flex justify-center">{field.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

type MockJournalRow = {
  id: string;
  expanded?: boolean;
  accent: "positive" | "negative" | "active";
  cells: Record<string, ReactNode>;
  accordion: {
    status: "Active" | "Closed";
    outcome: "Win" | "Loss" | "Open";
    profitTarget: string;
    profitTargetPct: string;
    stopLoss: string;
    stopLossPct: string;
    maxProfit: string;
    maxLoss: string;
    earnings: string;
    earningsEstimated?: boolean;
  };
};

const JOURNAL_FULL_COLUMNS = [
  "Date",
  "Symbol",
  "Market",
  "Qty",
  "Net P&L",
  "Entry / exit",
  "Hold",
  "Invested",
  "R:R",
  "Target / Stop",
  "Actions",
] as const;

const JOURNAL_COMPACT_COLUMNS = [
  "Date",
  "Symbol",
  "Market",
  "Qty",
  "Net P&L",
  "Entry / exit",
] as const;

function rowAccentClass(accent: MockJournalRow["accent"]) {
  if (accent === "positive") {
    return "border-l-emerald-500 bg-emerald-500/[0.07] dark:bg-emerald-500/10";
  }
  if (accent === "negative") {
    return "border-l-rose-500 bg-rose-500/[0.07] dark:bg-rose-500/10";
  }
  return "border-l-emerald-500/80 bg-muted/20";
}

function JournalTableCardMock({
  title,
  tradeCount,
  rows,
  columns,
  showPagination = true,
}: {
  title: string;
  tradeCount: number;
  columns: readonly string[];
  rows: MockJournalRow[];
  showPagination?: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm ring-1 ring-foreground/[0.03]">
      <header className="flex flex-col gap-2 border-b border-border/80 bg-gradient-to-r from-muted/50 via-card to-card px-3 py-3 sm:flex-row sm:items-start sm:justify-between sm:px-4">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[11px] font-semibold tracking-tight text-foreground sm:text-xs">
              {title}
            </h3>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-medium text-muted-foreground">
              {tradeCount} {tradeCount === 1 ? "trade" : "trades"}
            </span>
          </div>
          <p className="text-[9px] text-muted-foreground sm:text-[10px]">
            Click a row to expand trade details.
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[9px] font-medium text-muted-foreground">
          <Columns3 className="size-3" aria-hidden />
          Columns
        </span>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[58rem] table-fixed border-collapse text-center text-[10px] sm:text-[11px]">
          <thead className="sticky top-0 z-10 bg-card/95 backdrop-blur-md">
            <tr className="border-b border-border bg-muted/30">
              <th className="w-7 border-r border-border/50 px-0 py-2" />
              {columns.map((column) => (
                <th
                  key={column}
                  className="border-r border-border/50 px-2 py-2 text-[9px] font-medium uppercase tracking-[0.08em] text-muted-foreground last:border-r-0"
                >
                  {column === "Date" ? (
                    <span className="inline-flex items-center justify-center gap-0.5">
                      {column}
                      <ArrowDown className="size-3 text-foreground" aria-hidden />
                    </span>
                  ) : (
                    column
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <Fragment key={row.id}>
                <tr
                  className={cn(
                    "group cursor-pointer border-b border-border/60 border-l-[3px] transition-colors",
                    rowAccentClass(row.accent)
                  )}
                >
                  <td className="border-r border-border/50 px-0 py-2.5">
                    <span className="inline-flex size-5 items-center justify-center text-muted-foreground">
                      <ChevronRight
                        className={cn(
                          "size-3.5 transition-transform",
                          row.expanded && "rotate-90"
                        )}
                        aria-hidden
                      />
                    </span>
                  </td>
                  {columns.map((column) => (
                    <td
                      key={column}
                      className="border-r border-border/50 px-2 py-2.5 align-middle last:border-r-0"
                    >
                      {row.cells[column]}
                    </td>
                  ))}
                </tr>
                {row.expanded ? (
                  <tr className="border-b border-border/60">
                    <td
                      colSpan={columns.length + 1}
                      className="bg-muted/15 px-3 pb-3 pt-1"
                    >
                      <MockRowAccordionDetails {...row.accordion} />
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {showPagination ? (
        <div className="flex flex-col gap-2 border-t border-border/80 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <p className="text-[9px] text-muted-foreground sm:text-[10px]">
            Showing 1–{tradeCount} of {tradeCount}
          </p>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[9px] text-muted-foreground">
              Rows
              <span className="font-medium text-foreground">5</span>
            </span>
            <div className="flex items-center gap-1">
              <span className="inline-flex size-7 items-center justify-center rounded-md border border-border text-muted-foreground opacity-50">
                <ChevronLeft className="size-3.5" aria-hidden />
              </span>
              <span className="min-w-[3rem] text-center text-[9px] text-muted-foreground">
                1 / 1
              </span>
              <span className="inline-flex size-7 items-center justify-center rounded-md border border-border text-muted-foreground opacity-50">
                <ChevronRight className="size-3.5" aria-hidden />
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function buildJournalRowCells({
  date,
  symbol,
  marketPrice,
  marketChangePct,
  qty,
  pnl,
  entryExit,
  hold,
  invested,
  investedShare,
  rr,
  targetLabel,
  towardTarget = true,
  targetMarker = 62,
  showTargetStop = true,
}: {
  date: string;
  symbol: string;
  marketPrice: string;
  marketChangePct: number;
  qty: string;
  pnl: ReactNode;
  entryExit: string;
  hold: string;
  invested: string;
  investedShare: string;
  rr: string;
  targetLabel?: string;
  towardTarget?: boolean;
  targetMarker?: number;
  showTargetStop?: boolean;
}): Record<string, ReactNode> {
  return {
    Date: <span className="font-medium text-foreground">{date}</span>,
    Symbol: <span className={cn("font-bold tracking-tight", mockValue)}>{symbol}</span>,
    Market: (
      <MockMarketCell price={marketPrice} changePct={marketChangePct} />
    ),
    Qty: <span className={cn("font-medium", mockValue)}>{qty}</span>,
    "Net P&L": pnl,
    "Entry / exit": <span className={mockValue}>{entryExit}</span>,
    Hold: <span className="text-muted-foreground">{hold}</span>,
    Invested: (
      <span className={mockValue}>
        {invested}{" "}
        <span className="text-[9px] text-muted-foreground">({investedShare})</span>
      </span>
    ),
    "R:R": <span className={cn("font-medium", mockValue)}>{rr}</span>,
    "Target / Stop":
      showTargetStop && targetLabel ? (
        <MockTargetStopBar
          label={targetLabel}
          towardTarget={towardTarget}
          markerPosition={targetMarker}
        />
      ) : (
        <span className={mockMuted}>—</span>
      ),
    Actions: <MockTradeActions />,
  };
}

const ACTIVE_TRADE_ACCORDION = {
  status: "Active" as const,
  outcome: "Win" as const,
  profitTarget: "370",
  profitTargetPct: "+22.4%",
  stopLoss: "290",
  stopLossPct: "-4.1%",
  maxProfit: "+₹1,081.60",
  maxLoss: "-₹198.40",
  earnings: "May 10, 2027",
  earningsEstimated: true,
};

function JournalPreview({ compact = false }: { compact?: boolean }) {
  const columns = compact ? JOURNAL_COMPACT_COLUMNS : JOURNAL_FULL_COLUMNS;

  const activeRows: MockJournalRow[] = [
    {
      id: "artemismed",
      expanded: true,
      accent: "positive",
      cells: buildJournalRowCells({
        date: "Aug 3, 2026",
        symbol: "ARTEMISMED",
        marketPrice: "₹303.55",
        marketChangePct: 0.45,
        qty: "16",
        pnl: (
          <span className={mockPositive}>
            +₹18.40 <span className="text-[9px] opacity-80">(+0.38%)</span>
          </span>
        ),
        entryExit: "302.40/0",
        hold: "21.3h",
        invested: "₹4,838.40",
        investedShare: "27.0%",
        rr: "1:5.5",
        targetLabel: "2% to target",
        towardTarget: true,
        targetMarker: 88,
      }),
      accordion: ACTIVE_TRADE_ACCORDION,
    },
    {
      id: "avalon",
      accent: "negative",
      cells: buildJournalRowCells({
        date: "Aug 3, 2026",
        symbol: "AVALON",
        marketPrice: "₹177.35",
        marketChangePct: -2.43,
        qty: "10",
        pnl: (
          <span className={mockNegative}>
            -₹44.20 <span className="text-[9px] opacity-80">(-2.43%)</span>
          </span>
        ),
        entryExit: "181.77/0",
        hold: "4.1d",
        invested: "₹1,817.70",
        investedShare: "10.1%",
        rr: "1:22.3",
        targetLabel: "52% to stop",
        towardTarget: false,
        targetMarker: 24,
      }),
      accordion: {
        status: "Active",
        outcome: "Loss",
        profitTarget: "210",
        profitTargetPct: "+15.5%",
        stopLoss: "170",
        stopLossPct: "-6.5%",
        maxProfit: "+₹282.30",
        maxLoss: "-₹117.70",
        earnings: "Feb 3, 2027",
        earningsEstimated: true,
      },
    },
    {
      id: "sugil",
      accent: "positive",
      cells: buildJournalRowCells({
        date: "Aug 2, 2026",
        symbol: "SUGIL",
        marketPrice: "₹412.80",
        marketChangePct: 1.12,
        qty: "8",
        pnl: (
          <span className={mockPositive}>
            +₹26.40 <span className="text-[9px] opacity-80">(+0.81%)</span>
          </span>
        ),
        entryExit: "409.50/0",
        hold: "2.2d",
        invested: "₹3,276.00",
        investedShare: "18.3%",
        rr: "1:3.8",
        targetLabel: "8% to target",
        towardTarget: true,
        targetMarker: 72,
      }),
      accordion: ACTIVE_TRADE_ACCORDION,
    },
    {
      id: "chalet",
      accent: "positive",
      cells: buildJournalRowCells({
        date: "Jul 31, 2026",
        symbol: "CHALET",
        marketPrice: "₹892.15",
        marketChangePct: 0.28,
        qty: "5",
        pnl: (
          <span className={mockPositive}>
            +₹12.75 <span className="text-[9px] opacity-80">(+0.29%)</span>
          </span>
        ),
        entryExit: "889.60/0",
        hold: "5.6d",
        invested: "₹4,448.00",
        investedShare: "24.8%",
        rr: "1:4.2",
        targetLabel: "5% to target",
        towardTarget: true,
        targetMarker: 78,
      }),
      accordion: ACTIVE_TRADE_ACCORDION,
    },
    {
      id: "tcs",
      accent: "positive",
      cells: buildJournalRowCells({
        date: "Jul 28, 2026",
        symbol: "TCS",
        marketPrice: "₹4,015.00",
        marketChangePct: 0.62,
        qty: "2",
        pnl: (
          <span className={mockPositive}>
            +₹190.00 <span className="text-[9px] opacity-80">(+2.43%)</span>
          </span>
        ),
        entryExit: "3920/0",
        hold: "7.4d",
        invested: "₹7,840.00",
        investedShare: "43.8%",
        rr: "1:2.4",
        targetLabel: "12% to target",
        towardTarget: true,
        targetMarker: 65,
      }),
      accordion: ACTIVE_TRADE_ACCORDION,
    },
  ];

  const closedRows: MockJournalRow[] = [
    {
      id: "ioc",
      accent: "negative",
      cells: buildJournalRowCells({
        date: "Jul 24, 2026",
        symbol: "IOC",
        marketPrice: "—",
        marketChangePct: 0,
        qty: "200",
        pnl: <span className={mockNegative}>-₹1,175</span>,
        entryExit: "168.40/162.05",
        hold: "5d",
        invested: "₹33,680",
        investedShare: "100%",
        rr: "-3.62R",
        showTargetStop: false,
      }),
      accordion: {
        status: "Closed",
        outcome: "Loss",
        profitTarget: "175",
        profitTargetPct: "+3.9%",
        stopLoss: "162",
        stopLossPct: "-3.8%",
        maxProfit: "+₹1,400",
        maxLoss: "-₹1,175",
        earnings: "Nov 8, 2026",
        earningsEstimated: true,
      },
    },
  ];

  const visibleActiveRows = compact ? activeRows.slice(0, 3) : activeRows;
  const pickCells = (row: MockJournalRow) =>
    Object.fromEntries(columns.map((column) => [column, row.cells[column]]));

  return (
    <>
      <JournalHeaderMock />
      <JournalSummaryBarMock compact={compact} />
      <JournalTableCardMock
        title="Active trade log"
        tradeCount={visibleActiveRows.length}
        columns={columns}
        rows={visibleActiveRows.map((row) => ({ ...row, cells: pickCells(row) }))}
        showPagination={!compact}
      />
      {!compact ? (
        <JournalTableCardMock
          title="Closed trades"
          tradeCount={1}
          columns={columns}
          rows={closedRows.map((row) => ({ ...row, cells: pickCells(row) }))}
        />
      ) : null}
    </>
  );
}

function ReportSectionMock({
  index,
  title,
  description,
  children,
}: {
  index: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className={cn("text-[9px] font-semibold text-muted-foreground/80", mockValue)}>
          {index}
        </span>
        <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-foreground">
          {title}
        </span>
        <span className="h-px flex-1 bg-border/60" aria-hidden />
      </div>
      <p className="text-[10px] text-muted-foreground">{description}</p>
      {children}
    </div>
  );
}

function RMultipleSpectrumMock() {
  return (
    <div className={mockCard}>
      <p className="text-[11px] font-semibold text-foreground">
        R-multiple distribution
      </p>
      <p className="mt-0.5 text-[10px] text-muted-foreground">
        Outcome sizing relative to planned risk
      </p>
      <div className="mt-3 flex h-16 items-end gap-1">
        {[22, 18, 14, 10, 28, 34, 40].map((h, i) => (
          <div
            key={i}
            className={cn(
              "flex-1 rounded-t-sm",
              i < 3 ? "bg-rose-500/80" : i === 3 ? "bg-muted-foreground/30" : "bg-emerald-500/80"
            )}
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  );
}

function AnalyticsPreview() {
  return (
    <>
      <PageTitleMock
        title="Analytics"
        description="Deep-dive into edge, timing, risk, and strategy performance"
      />
      <ReportingPeriodMock />
      <p className="text-[10px] text-muted-foreground">
        Period <span className="font-medium text-foreground">2026</span> · Closed
        trades <span className="font-medium text-foreground">75</span> · Open
        positions <span className="font-medium text-foreground">2</span> ·{" "}
        Realized results only
      </p>

      <MetricStripMock />

      <ReportSectionMock
        index="01"
        title="Attribution"
        description="How results cluster by sector and company size"
      >
        <div className="grid gap-2 lg:grid-cols-2">
          <PieChartMock
            title="Performance by sector"
            subtitle="Realized P&L grouped by company sector"
            slices={[
              { label: "Financial Services", value: 34, color: "#10b981" },
              { label: "Technology", value: 28, color: "#34d399" },
              { label: "Energy", value: 18, color: "#f43f5e" },
              { label: "Other", value: 20, color: "#94a3b8" },
            ]}
          />
          <PieChartMock
            title="Performance by market cap"
            subtitle="Large, mid, small, and micro cap"
            slices={[
              { label: "Large cap", value: 42, color: "#10b981" },
              { label: "Mid cap", value: 31, color: "#34d399" },
              { label: "Small cap", value: 19, color: "#f43f5e" },
              { label: "Micro cap", value: 8, color: "#fb7185" },
            ]}
          />
        </div>
      </ReportSectionMock>

      <ReportSectionMock
        index="02"
        title="Performance"
        description="Realized P&L trend and open-position performance"
      >
        <div className="grid gap-2 lg:grid-cols-2">
          <PnlLineChartMock />
          <div className={mockCard}>
            <p className="text-[11px] font-semibold text-foreground">P&L chart</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              Daily mark-to-market P&L on open positions
            </p>
            <div className="mt-3 flex h-20 items-end gap-1.5">
              {[18, 42, -12, 28, 36, -8, 24].map((v, i) => (
                <div
                  key={i}
                  className="flex flex-1 flex-col items-center justify-end"
                >
                  <div
                    className={cn(
                      "w-full rounded-t-sm",
                      v >= 0 ? "bg-emerald-500" : "bg-rose-500"
                    )}
                    style={{ height: `${Math.abs(v) + 20}%` }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </ReportSectionMock>

      <ReportSectionMock
        index="03"
        title="Risk and outcome sizing"
        description="How results scale against planned risk"
      >
        <div className="grid gap-2 lg:grid-cols-2">
          <RMultipleSpectrumMock />
          <div className={mockCard}>
            <p className="text-[11px] font-semibold text-foreground">
              Edge &amp; payoff
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              Win rate, payoff ratio, and expectancy
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              {[
                { label: "Win rate", value: "64.2%" },
                { label: "Payoff", value: "1.87" },
                { label: "Expectancy", value: "+₹166" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg border border-border/70 bg-muted/20 px-2 py-2"
                >
                  <p className="text-[9px] text-muted-foreground">{item.label}</p>
                  <p className={cn("mt-1 text-xs font-semibold", mockValue)}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ReportSectionMock>
    </>
  );
}

function GoalsPreview() {
  return (
    <>
      <PageTitleMock
        title="Goals & Target Tracking"
        description="Set, monitor, and achieve your financial and execution milestones"
        action={
          <span className="shrink-0 rounded-md bg-emerald-500 px-2.5 py-1.5 text-[10px] font-semibold text-zinc-950">
            Set goal
          </span>
        }
      />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {[
          { label: "Active goals", value: "3" },
          { label: "Completed", value: "1" },
          { label: "Discipline streak", value: "4 days" },
        ].map((item) => (
          <div key={item.label} className={mockCard}>
            <p className="text-[10px] text-muted-foreground">{item.label}</p>
            <p className={cn("mt-1 text-sm font-semibold", mockValue)}>
              {item.value}
            </p>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {[
          { title: "Monthly P&L", progress: 72, value: "₹1,440 / ₹2,000" },
          { title: "Win rate target", progress: 61, value: "61% / 65%" },
          { title: "No overtrading streak", progress: 80, value: "16 / 20 days" },
        ].map((goal) => (
          <div key={goal.title} className={mockCard}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-foreground">{goal.title}</p>
              <p className="text-[11px] text-muted-foreground">{goal.value}</p>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{ width: `${goal.progress}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
