"use client";

import { ShowcaseDemoPlayer } from "@/components/landing/showcase-demo-player";

type LandingShowcaseProps = {
  defaultTab?: "dashboard" | "journal" | "analytics" | "goals";
};

export function LandingShowcase({ defaultTab = "dashboard" }: LandingShowcaseProps) {
  return (
    <section
      id="showcase"
      className="scroll-mt-20 border-y border-border/80 bg-muted/30 px-4 py-20 sm:px-6"
    >
      <div id="analytics" className="mx-auto max-w-6xl scroll-mt-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-emerald-400">Product preview</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Preview the same screens as the live app
          </h2>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            Switch between Dashboard, Journal, Analytics, and Goals — matching the
            navigation and layout you get after a free sign-up at
            swingtradinglog.com.
          </p>
        </div>

        <ShowcaseDemoPlayer defaultTab={defaultTab} />
      </div>
    </section>
  );
}
