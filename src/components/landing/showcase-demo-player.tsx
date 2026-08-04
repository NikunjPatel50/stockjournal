"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { DashboardMock } from "@/components/landing/dashboard-mock";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

const DEMO_STEPS = [
  {
    value: "dashboard",
    label: "Dashboard",
    variant: "dashboard" as const,
    headline: "Dashboard performance",
    detail:
      "Review KPI cards, Trade Pulse on open positions, overnight exposure, equity curve, and recent trades with period filters.",
  },
  {
    value: "journal",
    label: "Journal",
    variant: "journal" as const,
    headline: "Journal every trade",
    detail:
      "Search and filter trades, review daily and total P&L, then manage active and closed positions in the trade log.",
  },
  {
    value: "analytics",
    label: "Analytics",
    variant: "analytics" as const,
    headline: "Analytics deep-dive",
    detail:
      "Sector and market-cap attribution, P&L calendar, active-position P&L chart, R-multiple distribution, and tag rankings.",
  },
  {
    value: "goals",
    label: "Goals",
    variant: "goals" as const,
    headline: "Goals & discipline",
    detail:
      "Profit targets, win-rate goals, and process checklists — the same Goals page in the app sidebar.",
  },
] as const;

type StepValue = (typeof DEMO_STEPS)[number]["value"];

type ShowcaseDemoPlayerProps = {
  defaultTab?: StepValue;
};

export function ShowcaseDemoPlayer({
  defaultTab = "dashboard",
}: ShowcaseDemoPlayerProps) {
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState<StepValue>(defaultTab);

  const step = DEMO_STEPS.find((s) => s.value === active) ?? DEMO_STEPS[0];

  return (
    <div className="mt-10 min-w-0">
      <Tabs
        value={active}
        onValueChange={(value) => {
          if (value) setActive(value as StepValue);
        }}
        className="min-w-0"
      >
        <TabsList className="mx-auto flex h-auto w-full max-w-3xl justify-start gap-1 overflow-x-auto overscroll-x-contain bg-muted p-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:justify-center sm:overflow-visible [&::-webkit-scrollbar]:hidden">
          {DEMO_STEPS.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="shrink-0 px-3 py-2 data-active:bg-background data-active:text-foreground"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <motion.div
          key={active}
          role="status"
          aria-live="polite"
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
          className="mx-auto mt-4 max-w-2xl rounded-lg border border-border/80 bg-card/60 px-4 py-3 text-center sm:text-left"
        >
          <p className="text-sm font-semibold text-foreground">{step.headline}</p>
          <p className="mt-1 text-sm text-muted-foreground">{step.detail}</p>
        </motion.div>

        <TabsContent value={active} className="mt-6 focus-visible:outline-none">
          <div className="relative mx-auto w-full max-w-6xl">
            <div
              aria-hidden
              className="absolute -inset-4 rounded-3xl bg-emerald-500/10 dark:hidden"
            />
            <motion.div
              key={active}
              initial={
                reduceMotion ? false : { opacity: 0, scale: 0.985, y: 14 }
              }
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="relative"
            >
              <DashboardMock variant={step.variant} />
            </motion.div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
