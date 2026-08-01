"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useSettings } from "@/components/settings/settings-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

const numberField = z
  .union([z.number(), z.string()])
  .transform((v) => (typeof v === "string" ? Number(v) : v))
  .refine((v) => Number.isFinite(v) && v >= 0, "Must be a valid number");

const riskSchema = z.object({
  defaultCommission: numberField,
  commissionMode: z.enum(["per_trade", "per_contract"]),
  maxRiskMode: z.enum(["percent", "fixed"]),
  maxRiskValue: numberField,
  defaultRiskReward: z.string().min(3),
  dailyMaxDrawdown: numberField,
  dailyMaxDrawdownMode: z.enum(["percent", "fixed"]),
  maxConsecutiveLosses: numberField.pipe(z.number().int().min(1).max(20)),
});

type RiskInput = z.input<typeof riskSchema>;
type RiskValues = z.output<typeof riskSchema>;

export function RiskSettings() {
  const { settings, updateSettings } = useSettings();

  const form = useForm<RiskInput, unknown, RiskValues>({
    resolver: zodResolver(riskSchema),
    defaultValues: settings.risk,
  });

  useEffect(() => {
    form.reset(settings.risk);
  }, [settings.risk, form]);

  function onSubmit(values: RiskValues) {
    updateSettings((prev) => ({ ...prev, risk: values }));
    toast.success("Trading & risk defaults saved");
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle>Trading & Risk Defaults</CardTitle>
        <CardDescription>
          Defaults applied when logging new trades and guardrail alerts
        </CardDescription>
      </CardHeader>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Default Commission / Fee</Label>
              <Input
                type="number"
                step="any"
                {...form.register("defaultCommission")}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Commission Mode</Label>
              <Select
                value={form.watch("commissionMode")}
                onValueChange={(v) =>
                  v &&
                  form.setValue(
                    "commissionMode",
                    v as "per_trade" | "per_contract"
                  )
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="per_trade">Per Trade</SelectItem>
                  <SelectItem value="per_contract">Per Contract</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Max Risk Mode</Label>
              <Select
                value={form.watch("maxRiskMode")}
                onValueChange={(v) =>
                  v && form.setValue("maxRiskMode", v as "percent" | "fixed")
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">% of Account</SelectItem>
                  <SelectItem value="fixed">Fixed ₹ amount</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Default Max Risk per Trade</Label>
              <Input
                type="number"
                step="any"
                {...form.register("maxRiskValue")}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Default Risk/Reward Target</Label>
              <Input placeholder="1:2" {...form.register("defaultRiskReward")} />
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="mb-3 text-sm font-semibold">
              Hard Risk Guardrails / Circuit Breakers
            </h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Daily Max Drawdown Mode</Label>
                <Select
                  value={form.watch("dailyMaxDrawdownMode")}
                  onValueChange={(v) =>
                    v &&
                    form.setValue(
                      "dailyMaxDrawdownMode",
                      v as "percent" | "fixed"
                    )
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percent %</SelectItem>
                    <SelectItem value="fixed">Fixed ₹</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Daily Max Drawdown Limit</Label>
                <Input
                  type="number"
                  step="any"
                  {...form.register("dailyMaxDrawdown")}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Max Consecutive Loss Limit</Label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  {...form.register("maxConsecutiveLosses")}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Warn the trader after this many consecutive losses
                </p>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="bg-emerald-600 hover:bg-emerald-600/90">
            Save Risk Defaults
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
