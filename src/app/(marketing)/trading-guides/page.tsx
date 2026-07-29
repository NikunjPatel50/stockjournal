import type { Metadata } from "next";
import { ComingSoonPage } from "@/components/marketing/coming-soon";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Trading Guides",
  description:
    "Guides for swing traders using SwingTradingLog to journal and review trades.",
  path: "/trading-guides",
});

export default function TradingGuidesPage() {
  return (
    <ComingSoonPage
      title="Trading guides"
      description="Step-by-step guides for journaling swing trades and reviewing performance are on the way."
    />
  );
}
