import type { ReactNode } from "react";
import {
  BookOpen,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Target,
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
  { label: "Journal", icon: BookOpen },
  { label: "Goals", icon: Target },
  { label: "Settings", icon: Settings },
  { label: "Feedback", icon: MessageSquare },
] as const;

type MockVariant = "dashboard" | "journal" | "analytics" | "goals";

function mockPath(variant: MockVariant) {
  if (variant === "journal") return "journal";
  if (variant === "goals") return "goals";
  return "dashboard";
}

function activeNavLabel(variant: MockVariant) {
  if (variant === "journal") return "Journal";
  if (variant === "goals") return "Goals";
  return "Dashboard";
}

function MockSidebar({ variant }: { variant: MockVariant }) {
  const active = activeNavLabel(variant);

  return (
    <aside className="hidden w-[7.5rem] shrink-0 border-r border-sidebar-border bg-sidebar sm:flex sm:w-[8.75rem] sm:flex-col">
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
}: {
  variant?: MockVariant;
  className?: string;
  previewLabel?: string;
}) {
  const variantLabels: Record<MockVariant, string> = {
    dashboard:
      "Trading journal dashboard with KPIs, overnight gap exposure, and equity curve",
    journal:
      "Trading journal with trade log and shareable trade card preview",
    analytics:
      "Trading analytics with weekly P&L bars and reporting period filters",
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
          app.swingtradinglog.com/{mockPath(variant)}
        </div>
      </div>

      <div className="flex min-h-[280px] sm:min-h-[320px]">
        <MockSidebar variant={variant} />
        <div className="min-w-0 flex-1 space-y-3 bg-background p-3 sm:p-4">
          {variant === "dashboard" && <DashboardPreview />}
          {variant === "journal" && <JournalPreview />}
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
    <div className={cn(mockCard, "border-amber-500/25 bg-amber-500/5")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-semibold text-foreground">
          Overnight / weekend exposure
        </p>
        <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[9px] font-semibold text-amber-800 dark:text-amber-300">
          Weekend Risk
        </span>
      </div>
      <p className={cn("mt-1 text-sm font-semibold", mockValue)}>
        ₹18,420 exposed (22% of account)
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full w-[22%] rounded-full bg-emerald-500" />
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
        <span className="font-mono font-medium text-foreground">NVDA</span>
        <span>120 @ ₹142.50</span>
        <span className={mockPositive}>₹17,100</span>
      </div>
    </div>
  );
}

function ShareTradeCardMock() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-gradient-to-br from-zinc-900 to-emerald-950 p-3 text-zinc-100">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={cn("font-mono text-lg font-bold", NUMERIC_CLASS)}>NVDA</p>
          <p className="text-[10px] text-zinc-400">Breakout</p>
        </div>
        <span className="text-[10px] font-semibold tracking-wide text-emerald-400">
          STL
        </span>
      </div>
      <p className={cn("mt-2 text-[11px] text-zinc-300", NUMERIC_CLASS)}>
        ₹118.20 → ₹142.50
      </p>
      <p className={cn("mt-1 text-sm font-bold", mockPositive)}>+2.1R · +₹842</p>
      <p className="mt-1 text-[10px] text-zinc-500">Held 6 days · Long</p>
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
        "min-h-[4.5rem] bg-gradient-to-b from-card to-muted/40 px-2.5 py-2 sm:min-h-[5rem]"
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

function DashboardPreview() {
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

      <div className="grid gap-2 lg:grid-cols-2">
        <OvernightExposureMock />
        <div className={mockCard}>
          <p className="text-[11px] font-semibold text-foreground">
            Monthly performance
          </p>
          <p className={cn("mt-0.5 text-[10px]", mockMuted)}>YTD · closed trades</p>
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
          <p className={cn("mt-0.5", mockMuted)}>Outcome split · YTD</p>
          <div className="mt-3 rounded-lg border border-border bg-muted/30 p-2.5">
            <div className="flex items-start justify-between gap-2">
              <div>
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
    </>
  );
}

function JournalPreview() {
  const rows = [
    { ticker: "NVDA", pnl: "+₹842", outcome: "Win", date: "Jul 22" },
    { ticker: "AAPL", pnl: "-₹126", outcome: "Loss", date: "Jul 21" },
    { ticker: "TSLA", pnl: "+₹318", outcome: "Win", date: "Jul 18" },
    { ticker: "SPY", pnl: "+₹95", outcome: "Win", date: "Jul 15" },
  ];

  const summaryStats = [
    { label: "Filtered P&L", value: "+₹1,129", accent: "border-t-emerald-500", valueClass: mockPositive },
    { label: "Win rate", value: "75.0%", accent: "border-t-border", valueClass: mockValue },
    { label: "Avg hold time", value: "4.2d", accent: "border-t-border", valueClass: mockValue },
    { label: "Total loss", value: "₹126", accent: "border-t-rose-500", valueClass: mockNegative },
  ];

  return (
    <>
      <PageTitleMock
        title="Journal"
        description="4 closed trades this period"
        action={
          <span className="shrink-0 rounded-md bg-emerald-500 px-2.5 py-1.5 text-[10px] font-semibold text-zinc-950">
            + Add trade
          </span>
        }
      />

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {summaryStats.map((stat) => (
          <div
            key={stat.label}
            className={cn(
              "rounded-lg border border-border border-t-2 bg-card px-3 py-2.5",
              stat.accent
            )}
          >
            <p className="text-[10px] font-medium text-muted-foreground">
              {stat.label}
            </p>
            <p className={cn("mt-1 text-sm font-semibold", stat.valueClass)}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <div
          className={cn(
            "grid grid-cols-4 border-b border-border bg-muted/40 px-3 py-2",
            mockLabel
          )}
        >
          <span>Date</span>
          <span>Ticker</span>
          <span>Outcome</span>
          <span className="text-right">P&L</span>
        </div>
        {rows.map((row) => (
          <div
            key={row.ticker}
            className="grid grid-cols-4 border-b border-border/80 px-3 py-2.5 text-xs last:border-0"
          >
            <span className={mockMuted}>{row.date}</span>
            <span className={cn("font-medium", mockValue)}>{row.ticker}</span>
            <span className={mockMuted}>{row.outcome}</span>
            <span
              className={cn(
                "text-right font-medium",
                row.pnl.startsWith("+") ? mockPositive : mockNegative
              )}
            >
              {row.pnl}
            </span>
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        <p className={mockLabel}>Shareable trade card</p>
        <ShareTradeCardMock />
      </div>
    </>
  );
}

function AnalyticsPreview() {
  return (
    <>
      <PageTitleMock
        title="Dashboard"
        description="Portfolio performance and execution analytics"
      />
      <ReportingPeriodMock />
      <div className={mockCard}>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] font-semibold text-foreground">
            Performance overview
          </p>
          <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-semibold text-foreground">
            Weekly
          </span>
        </div>
        <p className={mockMuted}>Weekly P&L · last 8 weeks</p>
        <div className="mt-3 flex h-24 items-end gap-1.5">
          {[42, -28, 55, 18, -12, 68, 34, -22].map((v, i) => (
            <div
              key={i}
              className="flex flex-1 flex-col items-center justify-end"
            >
              <div
                className={cn(
                  "w-full rounded-t-sm",
                  v >= 0 ? "bg-emerald-500" : "bg-rose-500"
                )}
                style={{ height: `${Math.abs(v)}%` }}
              />
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-border bg-muted/30 p-2">
            <p className="text-[10px] text-muted-foreground">Best week</p>
            <p className={cn("mt-1 text-sm font-semibold", mockPositive)}>
              +₹2,140
            </p>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-2">
            <p className="text-[10px] text-muted-foreground">Expectancy</p>
            <p className={cn("mt-1 text-sm font-semibold", mockValue)}>
              +₹126.40
            </p>
          </div>
        </div>
      </div>
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
