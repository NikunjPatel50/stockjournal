import { format, parseISO } from "date-fns";
import { Award, Lock, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Milestone } from "@/lib/goals";

interface MilestoneTimelineProps {
  milestones: Milestone[];
}

export function MilestoneTimeline({ milestones }: MilestoneTimelineProps) {
  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-base">Milestones & Achievements</CardTitle>
        <CardDescription>
          Unlocked badges and upcoming performance milestones
        </CardDescription>
      </CardHeader>
      <CardContent>
        {milestones.length === 0 ? (
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
            Milestones unlock as you hit trading targets — set goals and log trades to earn badges.
          </div>
        ) : (
        <div className="relative space-y-0">
          <div className="absolute top-2 bottom-2 left-[15px] w-px bg-border md:left-1/2 md:-translate-x-px" />

          {milestones.map((ms, index) => {
            const left = index % 2 === 0;
            return (
              <div
                key={ms.id}
                className={`relative mb-6 grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-8 ${
                  left ? "" : "md:[&>*:first-child]:col-start-2"
                }`}
              >
                <div
                  className={`absolute top-3 left-[11px] z-10 flex size-2.5 rounded-full md:left-1/2 md:-translate-x-1/2 ${
                    ms.unlocked ? "bg-emerald-500" : "bg-muted-foreground/40"
                  }`}
                />

                <div
                  className={`ml-8 rounded-lg border border-border bg-background/50 p-4 md:ml-0 ${
                    left ? "md:mr-6 md:text-right" : "md:ml-6"
                  } ${ms.unlocked ? "" : "opacity-70"}`}
                >
                  <div
                    className={`mb-2 flex flex-wrap items-center gap-2 ${
                      left ? "md:justify-end" : ""
                    }`}
                  >
                    <Badge
                      className={
                        ms.unlocked
                          ? "bg-emerald-500/10 text-emerald-500"
                          : "bg-amber-500/10 text-amber-500"
                      }
                    >
                      {ms.unlocked ? (
                        <span className="inline-flex items-center gap-1">
                          <Sparkles className="size-3" />
                          Unlocked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <Lock className="size-3" />
                          Locked
                        </span>
                      )}
                    </Badge>
                    {ms.unlockedAt ? (
                      <span className="text-xs text-muted-foreground">
                        {format(parseISO(ms.unlockedAt), "MMM d, yyyy")}
                      </span>
                    ) : null}
                  </div>

                  <div
                    className={`flex items-start gap-2 ${
                      left ? "md:flex-row-reverse" : ""
                    }`}
                  >
                    <div
                      className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md ${
                        ms.unlocked
                          ? "bg-emerald-500/15 text-emerald-500"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Award className="size-4" />
                    </div>
                    <div>
                      <h4 className="font-semibold">{ms.title}</h4>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {ms.description}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Requirement: {ms.requirement}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        )}
      </CardContent>
    </Card>
  );
}
