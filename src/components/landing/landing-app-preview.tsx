"use client";

import dynamic from "next/dynamic";
import { AdminAccessProvider } from "@/components/admin/admin-access-provider";
import { JournalTradesProvider } from "@/components/journal-trades-provider";
import { JournalMarketProvider } from "@/components/journal/journal-market-provider";
import { LandingFixtureSeeder } from "@/components/landing/landing-fixture-seeder";
import { MarketQuotesProvider } from "@/components/market-quotes-provider";
import { SettingsProvider } from "@/components/settings/settings-provider";
import { Sidebar } from "@/components/sidebar";
import { UserStorageProvider } from "@/components/user-storage-provider";
import { LANDING_PREVIEW_USER_ID } from "@/lib/landing-fixture-trades";

const DashboardPage = dynamic(
  () => import("@/app/(app)/dashboard/page"),
  { ssr: false }
);
const JournalPage = dynamic(() => import("@/app/(app)/journal/page"), {
  ssr: false,
});
const AnalyticsPage = dynamic(() => import("@/app/(app)/analytics/page"), {
  ssr: false,
});
const CalendarPage = dynamic(() => import("@/app/(app)/calendar/page"), {
  ssr: false,
});

export type LandingPreviewVariant =
  | "dashboard"
  | "journal"
  | "analytics"
  | "calendar";

function PreviewPage({ variant }: { variant: LandingPreviewVariant }) {
  switch (variant) {
    case "dashboard":
      return <DashboardPage />;
    case "journal":
      return <JournalPage />;
    case "analytics":
      return <AnalyticsPage />;
    case "calendar":
      return <CalendarPage />;
    default:
      return null;
  }
}

export function LandingAppPreview({ variant }: { variant: LandingPreviewVariant }) {
  const activePath = `/${variant}`;

  return (
    <SettingsProvider>
      <LandingFixtureSeeder>
        <UserStorageProvider
          userId={LANDING_PREVIEW_USER_ID}
          userDisplayName="Demo User"
        >
          <AdminAccessProvider isAdmin={false}>
            <JournalTradesProvider>
              <JournalMarketProvider>
                <MarketQuotesProvider>
                  <div className="dark flex h-dvh min-h-0 w-full min-w-0 overflow-hidden bg-background">
                    <Sidebar pathnameOverride={activePath} />
                    <main
                      id="app-scroll-main"
                      className="app-scroll-main min-h-0 min-w-0 flex-1 overflow-y-auto bg-background"
                    >
                      <PreviewPage variant={variant} />
                    </main>
                  </div>
                </MarketQuotesProvider>
              </JournalMarketProvider>
            </JournalTradesProvider>
          </AdminAccessProvider>
        </UserStorageProvider>
      </LandingFixtureSeeder>
    </SettingsProvider>
  );
}
