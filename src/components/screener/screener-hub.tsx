"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppPageHeader } from "@/components/app-page-header";
import { ScreenerEmaCard } from "@/components/screener/screener-ema-card";
import { ScreenerSectorsPage } from "@/components/screener/screener-sectors-page";
import { ScreenerTurtleCard } from "@/components/screener/screener-turtle-card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { APP_PAGE_SHELL_CLASS } from "@/lib/app-shell";
import {
  parseScreenerTab,
  screenerTabHref,
  type ScreenerTab,
} from "@/lib/screener/tabs";
import { cn } from "@/lib/utils";

export function ScreenerHub({
  initialTab = "sectors",
}: {
  initialTab?: ScreenerTab;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<ScreenerTab>(initialTab);
  const [opened, setOpened] = useState({
    sectors: true,
    ema: initialTab === "ema",
    turtle: initialTab === "turtle",
  });

  return (
    <div className={APP_PAGE_SHELL_CLASS}>
      <AppPageHeader
        eyebrow="Private"
        title="Screener"
        description="Indian sector map, EMA support, and turtle Donchian breakouts."
      />

      <div className="space-y-4">
        <Tabs
          value={tab}
          onValueChange={(next) => {
            const value = parseScreenerTab(String(next));
            setTab(value);
            if (value === "ema" || value === "turtle") {
              setOpened((current) =>
                current[value] ? current : { ...current, [value]: true }
              );
            }
            router.replace(screenerTabHref(value), { scroll: false });
          }}
        >
          <TabsList className="h-9">
            <TabsTrigger value="sectors" className="px-3 text-xs">
              Sectors
            </TabsTrigger>
            <TabsTrigger value="ema" className="px-3 text-xs">
              EMA support
            </TabsTrigger>
            <TabsTrigger value="turtle" className="px-3 text-xs">
              Turtle breakout
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className={cn(tab === "sectors" ? undefined : "hidden")}>
          <ScreenerSectorsPage embedded />
        </div>
        {opened.ema ? (
          <div className={cn(tab === "ema" ? undefined : "hidden")}>
            <ScreenerEmaCard />
          </div>
        ) : null}
        {opened.turtle ? (
          <div className={cn(tab === "turtle" ? undefined : "hidden")}>
            <ScreenerTurtleCard />
          </div>
        ) : null}
      </div>
    </div>
  );
}
