import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Journal",
  description: "Log and review swing trades in your SwingTradingLog journal.",
  path: "/journal",
});

export default function JournalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
