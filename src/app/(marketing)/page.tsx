import type { Metadata } from "next";
import { LandingCtaBanner } from "@/components/landing/cta-banner";
import { LandingFaq } from "@/components/landing/faq";
import { LandingFooter } from "@/components/landing/footer";
import { LandingHero } from "@/components/landing/hero";
import { HomeSeoContent } from "@/components/landing/home-seo-content";
import { LandingNavbar } from "@/components/landing/navbar";
import { getSeoMetadata } from "@/lib/seo-pages";

export const metadata: Metadata = getSeoMetadata("home");

export default function LandingPage() {
  return (
    <>
      <LandingNavbar />
      <main>
        <LandingHero />
        <HomeSeoContent />
        <LandingFaq />
        <LandingCtaBanner />
      </main>
      <LandingFooter />
    </>
  );
}
