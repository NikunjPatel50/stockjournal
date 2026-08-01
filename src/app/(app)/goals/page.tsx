"use client";

import { useMemo, useState } from "react";
import { AddGoalModal } from "@/components/goals/add-goal-modal";
import { DisciplineChecklist } from "@/components/goals/discipline-checklist";
import { GoalsGrid } from "@/components/goals/goals-grid";
import { GoalsHeader } from "@/components/goals/goals-header";
import { GoalsSummary } from "@/components/goals/goals-summary";
import { MilestoneTimeline } from "@/components/goals/milestone-timeline";
import {
  computeGoalsSummary,
  filterGoals,
  type Goal,
  type GoalCategory,
  type GoalPeriod,
  type WeekDayAdherence,
} from "@/lib/goals";
import {
  defaultDisciplineRules,
  defaultMilestones,
  defaultWeekAdherence,
} from "@/lib/goals-defaults";
import { APP_PAGE_SHELL_CLASS } from "@/lib/app-shell";
import { useGoals } from "@/lib/goals-storage";
import { cn } from "@/lib/utils";

export default function GoalsPage() {
  const [period, setPeriod] = useState<GoalPeriod>("all");
  const { goals, setGoals } = useGoals();
  const [categoryTab, setCategoryTab] = useState<"all" | GoalCategory>("all");
  const [rules, setRules] = useState(defaultDisciplineRules);
  const [week, setWeek] = useState(defaultWeekAdherence);
  const [milestones] = useState(defaultMilestones);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  const visibleGoals = useMemo(
    () => filterGoals(goals, period, categoryTab),
    [goals, period, categoryTab]
  );

  const summary = useMemo(() => computeGoalsSummary(goals), [goals]);

  const streak = useMemo(
    () => week.filter((d) => d.adhered).length,
    [week]
  );

  const handleSaveGoal = (goal: Goal) => {
    setGoals((prev) => {
      const idx = prev.findIndex((g) => g.id === goal.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = goal;
        return next;
      }
      return [goal, ...prev];
    });
    setEditingGoal(null);
  };

  const handleToggleComplete = (goal: Goal) => {
    setGoals((prev) =>
      prev.map((g) =>
        g.id === goal.id ? { ...g, completed: !g.completed } : g
      )
    );
  };

  const handleToggleRule = (id: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, checked: !r.checked } : r))
    );
  };

  const handleToggleDay = (day: WeekDayAdherence["day"]) => {
    setWeek((prev) =>
      prev.map((d) => (d.day === day ? { ...d, adhered: !d.adhered } : d))
    );
  };

  return (
    <div className={cn(APP_PAGE_SHELL_CLASS, "gap-5")}>
      <GoalsHeader
        period={period}
        onPeriodChange={setPeriod}
        onSetGoal={() => {
          setEditingGoal(null);
          setModalOpen(true);
        }}
      />

      <GoalsSummary summary={summary} disciplineStreak={streak} />

      <GoalsGrid
        goals={visibleGoals}
        categoryTab={categoryTab}
        onCategoryChange={setCategoryTab}
        onEdit={(goal) => {
          setEditingGoal(goal);
          setModalOpen(true);
        }}
        onToggleComplete={handleToggleComplete}
        onViewTrades={() => {}}
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <DisciplineChecklist
          rules={rules}
          week={week}
          onToggleRule={handleToggleRule}
          onToggleDay={handleToggleDay}
        />
        <MilestoneTimeline milestones={milestones} />
      </div>

      <AddGoalModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        initialGoal={editingGoal}
        onSave={handleSaveGoal}
      />
    </div>
  );
}
