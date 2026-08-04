import type { Metadata } from "next";
import { LandingShowcase } from "@/components/landing/showcase";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { getSeoMetadata } from "@/lib/seo-pages";

export const metadata: Metadata = getSeoMetadata("preview");

export default function PreviewPage() {
  return (
    <MarketingPageShell breadcrumbs={[{ name: "Analytics", path: "/preview" }]}>
      <LandingShowcase defaultTab="analytics" />
    </MarketingPageShell>
  );
}
