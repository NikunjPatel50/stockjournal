import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/insforge/server";

/** Sole account allowed to access /admin (uses normal app login — no separate admin auth). */
export const ADMIN_EMAIL = "nicksofficialindia@gmail.com";

export function isAdminUser(user: {
  email?: string | null;
} | null | undefined): boolean {
  if (!user?.email) return false;
  return user.email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

export async function requireAdminUser() {
  const user = await getCurrentUser();
  if (!user || !isAdminUser(user)) {
    redirect("/dashboard");
  }
  return user;
}
