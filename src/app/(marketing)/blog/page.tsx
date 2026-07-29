import type { Metadata } from "next";
import { ComingSoonPage } from "@/components/marketing/coming-soon";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Blog",
  description:
    "Swing trading journal tips, process notes, and updates from SwingTradingLog.",
  path: "/blog",
});

export default function BlogPage() {
  return (
    <ComingSoonPage
      title="Blog"
      description="Articles on swing trading journals, review habits, and analytics will be published here."
    />
  );
}
