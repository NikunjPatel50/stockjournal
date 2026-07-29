"use client";

import { toast } from "sonner";
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  ColorSemantics,
  LandingPage,
  TableDensity,
  ThemeMode,
} from "@/lib/settings";

export function DisplaySettings() {
  const { settings, updateSettings } = useSettings();
  const { display } = settings;

  function patch<K extends keyof typeof display>(
    key: K,
    value: (typeof display)[K]
  ) {
    updateSettings((prev) => ({
      ...prev,
      display: { ...prev.display, [key]: value },
    }));
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle>Display & Visual Preferences</CardTitle>
        <CardDescription>
          Theme, accessibility palette, density, and default landing page
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-1.5">
          <Label>Theme</Label>
          <Select
            value={display.theme}
            onValueChange={(v) => v && patch("theme", v as ThemeMode)}
          >
            <SelectTrigger className="w-full max-w-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Color Semantics</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => patch("colorSemantics", "classic")}
              className={`rounded-lg border p-3 text-left transition-colors ${
                display.colorSemantics === "classic"
                  ? "border-emerald-500/50 bg-emerald-500/10"
                  : "border-border bg-background/40"
              }`}
            >
              <p className="text-sm font-medium">Classic</p>
              <p className="mt-1 text-xs text-muted-foreground">
                <span className="text-emerald-500">Green</span> profit /{" "}
                <span className="text-rose-500">Red</span> loss
              </p>
            </button>
            <button
              type="button"
              onClick={() => patch("colorSemantics", "colorblind" as ColorSemantics)}
              className={`rounded-lg border p-3 text-left transition-colors ${
                display.colorSemantics === "colorblind"
                  ? "border-cyan-500/50 bg-cyan-500/10"
                  : "border-border bg-background/40"
              }`}
            >
              <p className="text-sm font-medium">Colorblind-accessible</p>
              <p className="mt-1 text-xs text-muted-foreground">
                <span className="text-cyan-400">Cyan</span> profit /{" "}
                <span className="text-fuchsia-400">Magenta</span> loss
              </p>
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Table Density</Label>
          <Select
            value={display.density}
            onValueChange={(v) => v && patch("density", v as TableDensity)}
          >
            <SelectTrigger className="w-full max-w-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="compact">Compact</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="comfortable">Comfortable</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Default Landing Page</Label>
          <Select
            value={display.landingPage}
            onValueChange={(v) => v && patch("landingPage", v as LandingPage)}
          >
            <SelectTrigger className="w-full max-w-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="/dashboard">Dashboard</SelectItem>
              <SelectItem value="/journal">Journal</SelectItem>
              <SelectItem value="/goals">Goals</SelectItem>
              <SelectItem value="/settings">Settings</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-background/40 p-4">
          <div className="space-y-1">
            <Label htmlFor="allow-trade-sharing">Allow trade sharing</Label>
            <p className="text-xs text-muted-foreground">
              Public links and PNG cards for closed trades only. Default is on;
              turn off if you never want trade data to leave the app.
            </p>
          </div>
          <Switch
            id="allow-trade-sharing"
            checked={display.allowTradeSharing}
            onCheckedChange={(checked) =>
              patch("allowTradeSharing", Boolean(checked))
            }
          />
        </div>
      </CardContent>
      <CardFooter>
        <Button
          type="button"
          className="bg-emerald-600 hover:bg-emerald-600/90"
          onClick={() => toast.success("Display preferences applied")}
        >
          Confirm Display Settings
        </Button>
      </CardFooter>
    </Card>
  );
}
