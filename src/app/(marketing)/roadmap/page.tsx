import type { Metadata } from "next";
import { LandingRoadmap } from "@/components/landing/roadmap";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { getSeoMetadata } from "@/lib/seo-pages";

export const metadata: Metadata = getSeoMetadata("roadmap");

export default function RoadmapPage() {
  return (
    <MarketingPageShell breadcrumbs={[{ name: "Roadmap", path: "/roadmap" }]}>
      <LandingRoadmap />
    </MarketingPageShell>
  );
}
