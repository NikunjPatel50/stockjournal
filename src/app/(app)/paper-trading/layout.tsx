import type { Metadata } from "next";
import { requireAdminUser } from "@/lib/admin";
import { getSeoMetadata } from "@/lib/seo-pages";

export const metadata: Metadata = getSeoMetadata("paperTrading");

export default async function PaperTradingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminUser();
  return children;
}
