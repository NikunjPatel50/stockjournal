import type { Metadata } from "next";
import { getSeoMetadata } from "@/lib/seo-pages";

export const metadata: Metadata = getSeoMetadata("goals");

export default function GoalsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
