import type { Metadata } from "next";
import { ComingSoonPage } from "@/components/marketing/coming-soon";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Risk Calculator",
  description:
    "Position sizing and risk tools for swing traders — coming soon on SwingTradingLog.",
  path: "/risk-calculator",
});

export default function RiskCalculatorPage() {
  return (
    <ComingSoonPage
      title="Risk calculator"
      description="A simple risk and position-size calculator for swing trades is coming soon."
    />
  );
}
