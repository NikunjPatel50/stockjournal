import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";

const DEFAULT_ADMIN_EMAILS = ["nicksofficialindia@gmail.com"];

/** @deprecated Use getAdminEmails() — kept for any direct imports. */
export const ADMIN_EMAIL = DEFAULT_ADMIN_EMAILS[0]!;

function parseAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS?.trim();
  const source =
    raw && raw.length > 0 ? raw : DEFAULT_ADMIN_EMAILS.join(",");

  const parsed = source
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  return parsed.length > 0 ? parsed : DEFAULT_ADMIN_EMAILS;
}

let cachedAdminEmails: Set<string> | null = null;

export function getAdminEmails(): ReadonlySet<string> {
  if (!cachedAdminEmails) {
    cachedAdminEmails = new Set(parseAdminEmails());
  }
  return cachedAdminEmails;
}

export function isAdminUser(
  user: { email?: string | null } | null | undefined
): boolean {
  const email = user?.email?.trim().toLowerCase();
  if (!email) return false;
  return getAdminEmails().has(email);
}

export async function requireAdminUser() {
  const user = await getCurrentUser();
  if (!user || !isAdminUser(user)) {
    redirect("/dashboard");
  }
  return user;
}
