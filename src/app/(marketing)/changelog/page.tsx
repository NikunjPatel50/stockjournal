import type { Metadata } from "next";
import Link from "next/link";
import { LandingFooter } from "@/components/landing/footer";
import { LandingNavbar } from "@/components/landing/navbar";
import { MarketingBreadcrumbs } from "@/components/marketing/marketing-breadcrumbs";
import { Button } from "@/components/ui/button";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "SwingTradingLog Changelog | Latest Updates & Features",
  description:
    "See what's new in SwingTradingLog: journal updates, dashboard analytics, and feature releases for your free swing trading journal.",
  path: "/changelog",
  absoluteTitle: true,
});

export default function ChangelogPage() {
  return (
    <>
      <LandingNavbar />
      <MarketingBreadcrumbs items={[{ name: "Changelog", path: "/changelog" }]} />
      <main className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6 sm:py-20">
        <p className="text-sm font-medium text-emerald-500">Coming soon</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Product changelog
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          Release notes and product updates for SwingTradingLog will be published
          here. Follow along as we ship journal, analytics, and goals
          improvements during beta.
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
