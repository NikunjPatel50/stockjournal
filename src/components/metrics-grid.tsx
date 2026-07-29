import {
  ArrowUpRight,
  Percent,
  Scale,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { KpiStats } from "@/lib/dashboard-types";
import { cn, NUMERIC_DISPLAY_CLASS } from "@/lib/utils";

interface MetricsGridProps {
  stats: KpiStats;
}

export function MetricsGrid({ stats }: MetricsGridProps) {
  const pnlPositive = stats.pnlYtd >= 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Trades
          </CardTitle>
          <div className="rounded-md bg-secondary p-2 text-foreground">
            <TrendingUp className="size-4" />
          </div>
        </CardHeader>
        <CardContent>
          <p className={cn("text-3xl font-semibold", NUMERIC_DISPLAY_CLASS)}>
            {stats.totalTrades}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Logged this year</p>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Win Rate
          </CardTitle>
          <div className="rounded-md bg-primary/15 p-2 text-primary">
            <Percent className="size-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <p className={cn("text-3xl font-semibold", NUMERIC_DISPLAY_CLASS)}>
              {stats.winRate}%
            </p>
            <Badge className="bg-primary/15 text-primary hover:bg-primary/15">
              Strong
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Closed trades winning
          </p>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            P&L (YTD)
          </CardTitle>
          <div
            className={`rounded-md p-2 ${
              pnlPositive
                ? "bg-emerald-500/15 text-emerald-400"
                : "bg-rose-500/15 text-rose-400"
            }`}
          >
            <ArrowUpRight className="size-4" />
          </div>
        </CardHeader>
        <CardContent>
          <p
            className={cn(
              "text-3xl font-semibold",
              NUMERIC_DISPLAY_CLASS,
              pnlPositive ? "text-emerald-400" : "text-rose-400"
            )}
          >
            {pnlPositive ? "+" : ""}$
            {stats.pnlYtd.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Net realized profit
          </p>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Avg. Risk/Reward
          </CardTitle>
          <div className="rounded-md bg-secondary p-2 text-foreground">
            <Scale className="size-4" />
          </div>
        </CardHeader>
        <CardContent>
          <p className={cn("text-3xl font-semibold", NUMERIC_DISPLAY_CLASS)}>
            {stats.avgRiskReward}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Across all setups</p>
        </CardContent>
      </Card>
    </div>
  );
}
