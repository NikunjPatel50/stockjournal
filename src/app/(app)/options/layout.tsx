import { requireAdminUser } from "@/lib/admin";

export default async function OptionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminUser();
  return children;
}
