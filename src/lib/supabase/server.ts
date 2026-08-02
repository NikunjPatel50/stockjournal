import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { isJwtClockSkewError } from "@/lib/supabase/auth-errors";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";
import { mapSupabaseUser, type AppUser } from "@/lib/supabase/types";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component — middleware will refresh the session.
        }
      },
    },
  });
}

export async function getCurrentUser(): Promise<AppUser | null> {
  const supabase = await createSupabaseServerClient();
  let {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!user && isJwtClockSkewError(error?.message)) {
    await supabase.auth.refreshSession();
    ({
      data: { user },
      error,
    } = await supabase.auth.getUser());
  }

  if (error || !user) return null;
  return mapSupabaseUser(user);
}
