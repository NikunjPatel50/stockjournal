import type { Metadata } from "next";
import { getSeoMetadata } from "@/lib/seo-pages";

export const metadata: Metadata = getSeoMetadata("journal");

export default function JournalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
