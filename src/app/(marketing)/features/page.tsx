import type { Metadata } from "next";
import { LandingFeatures } from "@/components/landing/features";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { getSeoMetadata } from "@/lib/seo-pages";

export const metadata: Metadata = getSeoMetadata("features");

export default function FeaturesPage() {
  return (
    <MarketingPageShell breadcrumbs={[{ name: "Features", path: "/features" }]}>
      <LandingFeatures />
    </MarketingPageShell>
  );
}
