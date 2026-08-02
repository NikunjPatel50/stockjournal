import type { User } from "@supabase/supabase-js";

/** Normalized app user (matches prior InsForge shape used in the UI). */
export type AppUser = {
  id: string;
  email: string | null;
  emailVerified: boolean;
  createdAt?: string;
  profile?: { name?: string | null } | null;
};

export function mapSupabaseUser(user: User): AppUser {
  const meta = user.user_metadata ?? {};
  const name =
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    null;

  return {
    id: user.id,
    email: user.email ?? null,
    emailVerified: Boolean(user.email_confirmed_at),
    createdAt: user.created_at,
    profile: { name },
  };
}
