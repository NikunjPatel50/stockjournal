import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Analytics",
  description: "Swing trading analytics — weekly P&L, breakdowns, and trade stats.",
  path: "/analytics",
});

export default function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
