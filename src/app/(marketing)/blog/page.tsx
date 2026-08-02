import type { Metadata } from "next";
import Link from "next/link";
import { LandingFooter } from "@/components/landing/footer";
import { LandingNavbar } from "@/components/landing/navbar";
import { MarketingBreadcrumbs } from "@/components/marketing/marketing-breadcrumbs";
import { Button } from "@/components/ui/button";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Swing Trading Blog | Tips & Strategies | SwingTradingLog",
  description:
    "Swing trading journal tips, performance reviews, and strategy notes. Free insights from SwingTradingLog — start tracking trades today.",
  path: "/blog",
  absoluteTitle: true,
});

export default function BlogPage() {
  return (
    <>
      <LandingNavbar />
      <MarketingBreadcrumbs items={[{ name: "Blog", path: "/blog" }]} />
      <main className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6 sm:py-20">
        <p className="text-sm font-medium text-emerald-500">Coming soon</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Swing Trading Insights &amp; Strategies
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          Articles on how to start a swing trading journal, review weekly
          performance, manage overnight gap risk, and build better trading
          habits. The first posts are on the way — sign up free to use the
          journal while we publish.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/login">
            <Button className="bg-emerald-500 text-zinc-950 hover:bg-emerald-400">
              Start free — no credit card
            </Button>
          </Link>
          <Link href="/trading-guides">
            <Button variant="outline">Browse trading guides</Button>
          </Link>
        </div>
      </main>
      <LandingFooter />
    </>
  );
}
