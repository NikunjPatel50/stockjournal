"use client";

import { GoalCard } from "@/components/goals/goal-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Goal, GoalCategory } from "@/lib/goals";

interface GoalsGridProps {
  goals: Goal[];
  categoryTab: "all" | GoalCategory;
  onCategoryChange: (tab: "all" | GoalCategory) => void;
  onEdit: (goal: Goal) => void;
  onToggleComplete: (goal: Goal) => void;
  onViewTrades: (goal: Goal) => void;
}

const TABS: { value: "all" | GoalCategory; label: string }[] = [
  { value: "all", label: "All Goals" },
  { value: "financial", label: "Financial Targets" },
  { value: "risk", label: "Risk Management" },
  { value: "habit", label: "Execution & Habits" },
];

export function GoalsGrid({
  goals,
  categoryTab,
  onCategoryChange,
  onEdit,
  onToggleComplete,
  onViewTrades,
}: GoalsGridProps) {
  return (
    <Tabs
      value={categoryTab}
      onValueChange={(value) => {
        if (
          value === "all" ||
          value === "financial" ||
          value === "risk" ||
          value === "habit"
        ) {
          onCategoryChange(value);
        }
      }}
    >
      <TabsList className="mb-4 h-auto flex-wrap">
        {TABS.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {TABS.map((tab) => (
        <TabsContent key={tab.value} value={tab.value}>
          {goals.length === 0 ? (
            <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
              No goals in this category for the selected period.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {goals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onEdit={onEdit}
                  onToggleComplete={onToggleComplete}
                  onViewTrades={onViewTrades}
                />
              ))}
            </div>
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}
