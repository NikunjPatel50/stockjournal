"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  BarChart3,
  Calculator,
  LineChart,
  Mail,
  Plug,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

type RoadmapStatus = "live" | "building" | "planned";

type RoadmapItem = {
  id: string;
  title: string;
  description: string;
  status: RoadmapStatus;
  icon: typeof BarChart3;
};

type RoadmapPhase = {
  id: string;
  label: string;
  code: string;
  items: RoadmapItem[];
};

const PHASES: RoadmapPhase[] = [
  {
    id: "now",
    label: "Shipped in beta",
    code: "T+0",
    items: [
      {
        id: "journal",
        title: "Dashboard, Journal & Settings",
        description: "KPIs, charts, trade log, risk settings, CSV/JSON export.",
        status: "live",
        icon: BarChart3,
      },
      {
        id: "exposure",
        title: "Overnight & weekend exposure",
        description: "Gap risk on open trades with weekend/holiday flags.",
        status: "live",
        icon: LineChart,
      },
      {
        id: "goals",
        title: "Goals, trade cards & feedback",
        description: "Targets, shareable cards, and in-app product feedback.",
        status: "live",
        icon: Sparkles,
      },
    ],
  },
  {
    id: "next",
    label: "Building now",
    code: "T+swing",
    items: [
      {
        id: "risk-calc",
        title: "Risk & position-size calculator",
        description: "Size from stop distance and account risk.",
        status: "building",
        icon: Calculator,
      },
      {
        id: "quotes",
        title: "Live quotes on exposure",
        description: "Mark-to-market open positions.",
        status: "building",
        icon: LineChart,
      },
    ],
  },
  {
    id: "later",
    label: "After beta",
    code: "T+target",
    items: [
      {
        id: "brokers",
        title: "Broker connections",
        description: "Optional read-only sync.",
        status: "planned",
        icon: Plug,
      },
      {
        id: "digest",
        title: "Weekly digest email",
        description: "Opt-in trades and goal summary.",
        status: "planned",
        icon: Mail,
      },
      {
        id: "mobile-app",
        title: "Mobile application",
        description: "Native iOS & Android apps coming.",
        status: "planned",
        icon: Smartphone,
      },
    ],
  },
];

const STATUS_DOT: Record<RoadmapStatus, string> = {
  live: "bg-emerald-500",
  building: "bg-amber-500",
  planned: "bg-muted-foreground/45",
};

const PHASE_RING: Record<string, string> = {
  now: "border-emerald-500/25",
  next: "border-amber-500/20",
  later: "border-border",
};

function RoadmapItemRow({ item }: { item: RoadmapItem }) {
  const Icon = item.icon;
  return (
    <li className="flex gap-2.5 rounded-lg border border-border/80 bg-card/70 px-3 py-2.5">
      <span
        className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", STATUS_DOT[item.status])}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Icon className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
          <p className="text-sm font-medium leading-snug text-foreground">{item.title}</p>
        </div>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          {item.description}
        </p>
      </div>
    </li>
  );
}

export function LandingRoadmap() {
  const reduceMotion = useReducedMotion();

  return (
    <section
      id="roadmap"
      className="relative scroll-mt-20 border-y border-border/80 px-4 py-12 sm:px-6 sm:py-14"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,oklch(0.5_0_0/0.035)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.5_0_0/0.035)_1px,transparent_1px)] bg-size-[20px_20px] mask-[radial-gradient(ellipse_at_center,black,transparent_80%)]"
      />

      <div className="relative mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">
            Product roadmap · SwingTradingLog
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Shipped, building, and{" "}
            <span className="text-muted-foreground">on deck</span>
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Beta priorities in one view, updated as we ship and as you send{" "}
            <a
              href="/feedback"
              className="font-medium text-emerald-600 underline-offset-2 hover:underline dark:text-emerald-400"
            >
              feedback
            </a>
            .
          </p>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          {PHASES.map((phase, phaseIndex) => (
            <motion.div
              key={phase.id}
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-20px" }}
              transition={{ duration: 0.35, delay: phaseIndex * 0.05 }}
              className={cn(
                "rounded-xl border bg-card/40 p-3 sm:p-4",
                PHASE_RING[phase.id]
              )}
            >
              <div className="mb-3 flex items-baseline justify-between gap-2 border-b border-border/60 pb-2">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {phase.code}
                  </span>
                  <p className="text-sm font-semibold text-foreground">{phase.label}</p>
                </div>
                <span className="text-[10px] tabular-nums text-muted-foreground">
                  {phase.items.length} items
                </span>
              </div>
              <ul className="space-y-2">
                {phase.items.map((item) => (
                  <RoadmapItemRow key={item.id} item={item} />
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground sm:justify-start">
          <span className="inline-flex items-center gap-1.5">
            <span className={cn("size-1.5 rounded-full", STATUS_DOT.live)} />
            Live
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className={cn("size-1.5 rounded-full", STATUS_DOT.building)} />
            In progress
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className={cn("size-1.5 rounded-full", STATUS_DOT.planned)} />
            Planned
          </span>
        </div>
      </div>
    </section>
  );
}
