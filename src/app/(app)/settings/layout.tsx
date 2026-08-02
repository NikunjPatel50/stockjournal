import type { Metadata } from "next";
import { getSeoMetadata } from "@/lib/seo-pages";

export const metadata: Metadata = getSeoMetadata("settings");

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
