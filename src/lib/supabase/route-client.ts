import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAuthSafeFetch } from "@/lib/supabase/auth-fetch";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

/** Supabase client for Route Handlers — persists auth cookies via `cookies()`. */
export async function createSupabaseRouteClient() {
  const cookieStore = await cookies();
  const supabaseKey = getSupabaseAnonKey();

  return createServerClient(getSupabaseUrl(), supabaseKey, {
    global: {
      fetch: createAuthSafeFetch(supabaseKey),
    },
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
          // Route handlers allow cookie writes; ignore if called elsewhere.
        }
      },
    },
  });
}
