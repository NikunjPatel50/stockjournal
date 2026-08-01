import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/site";
import { requireAdminUser } from "@/lib/admin";

export const metadata: Metadata = buildPageMetadata({
  title: "Admin",
  description: "Swing Trading Log admin panel.",
  path: "/admin",
});

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminUser();
  return children;
}
