import type { Metadata } from "next";
import { LandingFaq } from "@/components/landing/faq";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { FaqJsonLd } from "@/components/seo/faq-json-ld";
import { getSeoMetadata } from "@/lib/seo-pages";

export const metadata: Metadata = getSeoMetadata("faq");

export default function FaqPage() {
  return (
    <>
      <FaqJsonLd />
      <MarketingPageShell breadcrumbs={[{ name: "FAQ", path: "/faq" }]}>
        <LandingFaq />
      </MarketingPageShell>
    </>
  );
}
