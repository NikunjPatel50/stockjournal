"use client";

import { useEffect, startTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ThemeProvider } from "next-themes";
import { SiteChatbotGate } from "@/components/marketing/site-chatbot-gate";
import { SettingsProvider, useSettings } from "@/components/settings/settings-provider";
import { Toaster } from "@/components/ui/sonner";
import { isPublicPath } from "@/lib/public-paths";

function LandingRedirect() {
  const { settings, hydrated } = useSettings();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!hydrated) return;
    // Only apply preferred landing page inside the authenticated app shell.
    if (isPublicPath(pathname)) return;
    const key = "tradetracker_session_landed";
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    const target = settings.display.landingPage;
    if (target && target !== pathname) {
      startTransition(() => {
        router.replace(target);
      });
    }
  }, [hydrated, settings.display.landingPage, pathname, router]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
      storageKey="swingtradinglog-theme"
    >
      <SettingsProvider>
        <LandingRedirect />
        {children}
        <SiteChatbotGate />
        <Toaster richColors position="top-right" />
      </SettingsProvider>
    </ThemeProvider>
  );
}
