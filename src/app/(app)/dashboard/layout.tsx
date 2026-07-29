import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Dashboard",
  description: "Swing trading performance dashboard — KPIs, equity curve, and P&L.",
  path: "/dashboard",
});

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
