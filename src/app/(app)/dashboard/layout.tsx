import type { Metadata } from "next";
import { getSeoMetadata } from "@/lib/seo-pages";

export const metadata: Metadata = getSeoMetadata("dashboard");

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
