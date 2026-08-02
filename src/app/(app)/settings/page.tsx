"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Database,
  Gauge,
  KeyRound,
  Palette,
  Tags,
  UserRound,
} from "lucide-react";
import { CustomizationSettings } from "@/components/settings/customization-settings";
import { DataSettings } from "@/components/settings/data-settings";
import { DisplaySettings } from "@/components/settings/display-settings";
import { PasswordSettings } from "@/components/settings/password-settings";
import { ProfileSettings } from "@/components/settings/profile-settings";
import { RiskSettings } from "@/components/settings/risk-settings";
import { AppPageHeader } from "@/components/app-page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { APP_PAGE_SHELL_CLASS, MOBILE_NAV_OFFSET_CLASS } from "@/lib/app-shell";

const NAV = [
  {
    value: "profile",
    label: "Profile & account",
    description: "Name, currency, balance",
    icon: UserRound,
  },
  {
    value: "password",
    label: "Password",
    description: "Sign-in security",
    icon: KeyRound,
  },
  {
    value: "risk",
    label: "Trading & risk",
    description: "Commissions and limits",
    icon: Gauge,
  },
  {
    value: "customization",
    label: "Journal",
    description: "Tags and strategies",
    icon: Tags,
  },
  {
    value: "display",
    label: "Display",
    description: "Theme and layout",
    icon: Palette,
  },
  {
    value: "data",
    label: "Data",
    description: "Backup and export",
    icon: Database,
  },
] as const;

type TabValue = (typeof NAV)[number]["value"];

function isTabValue(value: string | null): value is TabValue {
  return NAV.some((item) => item.value === value);
}

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [tab, setTab] = useState<TabValue>(
    isTabValue(tabParam) ? tabParam : "profile"
  );

  useEffect(() => {
    if (isTabValue(tabParam)) setTab(tabParam);
  }, [tabParam]);

  return (
    <div className={APP_PAGE_SHELL_CLASS}>
      <AppPageHeader
        eyebrow="Workspace"
        title="Settings"
        description="Account defaults, risk guardrails, journal taxonomy, and data controls."
      />

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-none lg:flex">
        <Tabs
          value={tab}
          onValueChange={(value) => {
            if (isTabValue(value)) setTab(value);
          }}
          orientation="vertical"
          className="w-full gap-0 lg:flex-row"
        >
          <aside
            className={cn(
              "min-w-0 border-b border-border bg-muted/30 p-3 lg:w-64 lg:shrink-0 lg:border-r lg:border-b-0",
              MOBILE_NAV_OFFSET_CLASS
            )}
          >
            <TabsList
              variant="line"
              className="h-auto w-full min-w-0 flex-row gap-1 overflow-x-auto bg-transparent p-0 [-ms-overflow-style:none] [scrollbar-width:none] lg:flex-col lg:items-stretch lg:gap-0.5 lg:overflow-visible [&::-webkit-scrollbar]:hidden"
            >
              {NAV.map((item) => {
                const Icon = item.icon;
                const active = tab === item.value;
                return (
                  <TabsTrigger
                    key={item.value}
                    value={item.value}
                    className={cn(
                      "h-auto w-full shrink-0 flex-col items-start gap-0.5 rounded-md border border-transparent px-3 py-2.5 text-left after:hidden lg:shrink",
                      "data-active:border-border/60 data-active:bg-background data-active:shadow-sm",
                      "hover:bg-background/60"
                    )}
                  >
                    <span className="flex w-full items-center gap-2 text-sm font-medium whitespace-nowrap">
                      <Icon
                        className={cn(
                          "size-4 shrink-0",
                          active
                            ? "text-foreground"
                            : "text-muted-foreground"
                        )}
                      />
                      {item.label}
                    </span>
                    <span className="hidden w-full pl-6 text-xs font-normal text-muted-foreground lg:block">
                      {item.description}
                    </span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </aside>

          <div className="min-w-0 flex-1 bg-card">
            <TabsContent value="profile" className="mt-0">
              <ProfileSettings />
            </TabsContent>
            <TabsContent value="password" className="mt-0 p-4 sm:p-6">
              <PasswordSettings />
            </TabsContent>
            <TabsContent value="risk" className="mt-0 p-4 sm:p-6">
              <RiskSettings />
            </TabsContent>
            <TabsContent value="customization" className="mt-0 p-4 sm:p-6">
              <CustomizationSettings />
            </TabsContent>
            <TabsContent value="display" className="mt-0 p-4 sm:p-6">
              <DisplaySettings />
            </TabsContent>
            <TabsContent value="data" className="mt-0 p-4 sm:p-6">
              <DataSettings />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
