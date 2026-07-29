import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Settings",
  description: "Account, risk, and data settings for your swing trading journal.",
  path: "/settings",
});

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
