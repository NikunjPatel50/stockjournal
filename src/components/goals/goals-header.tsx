"use client";

import { Plus } from "lucide-react";
import { AppPageHeader } from "@/components/app-page-header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { GoalPeriod } from "@/lib/goals";

interface GoalsHeaderProps {
  period: GoalPeriod;
  onPeriodChange: (period: GoalPeriod) => void;
  onSetGoal: () => void;
}

const PERIODS: { value: GoalPeriod; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annual", label: "Annual" },
  { value: "all", label: "All Active" },
];

export function GoalsHeader({
  period,
  onPeriodChange,
  onSetGoal,
}: GoalsHeaderProps) {
  return (
    <div className="space-y-4">
      <AppPageHeader
        title="Goals & Target Tracking"
        description="Set, monitor, and achieve your financial and execution milestones"
        className="[&_h1]:text-xl [&_h1]:sm:text-2xl"
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Tabs
            value={period}
            onValueChange={(value) => {
              if (typeof value === "string") onPeriodChange(value as GoalPeriod);
            }}
          >
            <TabsList className="h-auto w-max max-w-none flex-nowrap sm:flex-wrap">
              {PERIODS.map((p) => (
                <TabsTrigger key={p.value} value={p.value} className="px-3">
                  {p.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <Button
          onClick={onSetGoal}
          className="h-10 w-full shrink-0 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-600/90 sm:h-9 sm:w-auto"
        >
          <Plus className="size-4" />
          Set New Goal
        </Button>
      </div>
    </div>
  );
}
