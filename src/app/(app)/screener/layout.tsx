import type { Metadata } from "next";
import { requireAdminUser } from "@/lib/admin";
import { getSeoMetadata } from "@/lib/seo-pages";

export const metadata: Metadata = getSeoMetadata("screener");

export default async function ScreenerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminUser();
  return children;
}
