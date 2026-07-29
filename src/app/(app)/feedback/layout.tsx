import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Feedback",
  description:
    "Suggest features and improvements for SwingTradingLog.",
  path: "/feedback",
});

export default function FeedbackLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
