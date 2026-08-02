import type { Metadata } from "next";
import { LandingPricing } from "@/components/landing/pricing";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { getFreePriceForCountry } from "@/lib/geo-pricing";
import { getRequestCountry } from "@/lib/request-country";
import { getSeoMetadata } from "@/lib/seo-pages";

export const metadata: Metadata = getSeoMetadata("pricing");

export default async function PricingPage() {
  const country = await getRequestCountry();
  const freePrice = getFreePriceForCountry(country);

  return (
    <MarketingPageShell breadcrumbs={[{ name: "Pricing", path: "/pricing" }]}>
      <LandingPricing freePrice={freePrice} />
    </MarketingPageShell>
  );
}
