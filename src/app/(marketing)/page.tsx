import type { Metadata } from "next";
import { LandingCtaBanner } from "@/components/landing/cta-banner";
import { LandingFaq } from "@/components/landing/faq";
import { LandingFeatures } from "@/components/landing/features";
import { LandingFooter } from "@/components/landing/footer";
import { LandingHero } from "@/components/landing/hero";
import { LandingNavbar } from "@/components/landing/navbar";
import { LandingPricing } from "@/components/landing/pricing";
import { LandingRoadmap } from "@/components/landing/roadmap";
import { LandingShowcase } from "@/components/landing/showcase";
import { FaqJsonLd } from "@/components/seo/faq-json-ld";
import { getFreePriceForCountry } from "@/lib/geo-pricing";
import { getRequestCountry } from "@/lib/request-country";
import { getSeoMetadata } from "@/lib/seo-pages";

export const metadata: Metadata = getSeoMetadata("home");

export default async function LandingPage() {
  const country = await getRequestCountry();
  const freePrice = getFreePriceForCountry(country);

  return (
    <>
      <FaqJsonLd />
      <LandingNavbar />
      <main>
        <LandingHero />
        <LandingFeatures />
        <LandingShowcase />
        <LandingPricing freePrice={freePrice} />
        <LandingRoadmap />
        <LandingFaq />
        <LandingCtaBanner />
      </main>
      <LandingFooter />
    </>
  );
}
