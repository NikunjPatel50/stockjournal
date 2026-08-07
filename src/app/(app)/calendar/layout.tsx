import type { Metadata } from "next";
import { getSeoMetadata } from "@/lib/seo-pages";

export const metadata: Metadata = getSeoMetadata("calendar");

export default function CalendarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
