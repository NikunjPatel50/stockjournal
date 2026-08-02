import type { Metadata } from "next";
import Link from "next/link";
import { LandingFooter } from "@/components/landing/footer";
import { LandingNavbar } from "@/components/landing/navbar";
import { MarketingBreadcrumbs } from "@/components/marketing/marketing-breadcrumbs";
import { Button } from "@/components/ui/button";
import { getSeoMetadata } from "@/lib/seo-pages";

export const metadata: Metadata = getSeoMetadata("riskCalculator");

export default function RiskCalculatorPage() {
  return (
    <>
      <LandingNavbar />
      <MarketingBreadcrumbs
        items={[{ name: "Risk Calculator", path: "/risk-calculator" }]}
      />
      <main className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6 sm:py-20">
        <p className="text-sm font-medium text-emerald-500">Coming soon</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Position size &amp; risk calculator
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          A simple risk and position-size calculator for swing trades — plan
          stop loss, target, and share size before you enter. Meanwhile, track
          overnight gap exposure on the{" "}
          <Link
            href="/login"
            className="font-medium text-emerald-600 underline-offset-2 hover:underline dark:text-emerald-400"
          >
            Dashboard
          </Link>
          .
        </p>
        <Link href="/trading-guides" className="mt-8 inline-block">
          <Button variant="outline">View trading guides</Button>
        </Link>
      </main>
      <LandingFooter />
    </>
  );
}
