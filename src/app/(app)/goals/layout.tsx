import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Goals",
  description: "Track swing trading goals and discipline in SwingTradingLog.",
  path: "/goals",
});

export default function GoalsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
