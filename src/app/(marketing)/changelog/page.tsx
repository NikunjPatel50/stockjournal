import type { Metadata } from "next";
import { ComingSoonPage } from "@/components/marketing/coming-soon";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Changelog",
  description:
    "Product updates for SwingTradingLog, the free swing trading journal.",
  path: "/changelog",
});

export default function ChangelogPage() {
  return (
    <ComingSoonPage
      title="Changelog"
      description="Release notes and product updates for SwingTradingLog will live here soon."
    />
  );
}
