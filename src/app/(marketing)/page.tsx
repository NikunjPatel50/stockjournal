import type { Metadata } from "next";
import { LandingCtaBanner } from "@/components/landing/cta-banner";
import { LandingFooter } from "@/components/landing/footer";
import { LandingHero } from "@/components/landing/hero";
import { LandingNavbar } from "@/components/landing/navbar";
import { getSeoMetadata } from "@/lib/seo-pages";

export const metadata: Metadata = getSeoMetadata("home");

export default function LandingPage() {
  return (
    <>
      <LandingNavbar />
      <main>
        <LandingHero />
        <LandingCtaBanner />
      </main>
      <LandingFooter />
    </>
  );
}
