import type { Metadata } from "next";
import Link from "next/link";
import { LandingFooter } from "@/components/landing/footer";
import { LandingNavbar } from "@/components/landing/navbar";
import { MarketingBreadcrumbs } from "@/components/marketing/marketing-breadcrumbs";
import { Button } from "@/components/ui/button";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Trading Guides for Swing Traders | Free Resources | SwingTradingLog",
  description:
    "Free swing trading guides: journal setup, risk management, and performance review workflows. Practical resources from SwingTradingLog.",
  path: "/trading-guides",
  absoluteTitle: true,
});

export default function TradingGuidesPage() {
  return (
    <>
      <LandingNavbar />
      <MarketingBreadcrumbs
        items={[{ name: "Trading Guides", path: "/trading-guides" }]}
      />
      <main className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6 sm:py-20">
        <p className="text-sm font-medium text-emerald-500">Coming soon</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Trading guides for swing traders
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          Step-by-step guides for journaling swing trades, sizing positions,
          tracking P&amp;L, and reviewing performance. Pair these with the free{" "}
          <Link
            href="/risk-calculator"
            className="font-medium text-emerald-600 underline-offset-2 hover:underline dark:text-emerald-400"
          >
            risk calculator
          </Link>{" "}
          when it launches.
        </p>
        <Link href="/" className="mt-8 inline-block">
          <Button className="bg-emerald-500 text-zinc-950 hover:bg-emerald-400">
            Back to home
          </Button>
        </Link>
      </main>
      <LandingFooter />
    </>
  );
}
