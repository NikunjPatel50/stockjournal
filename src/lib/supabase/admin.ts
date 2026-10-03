import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
} from "@/lib/supabase/env";

/**
 * Service-role client for /admin (bypasses RLS). Server-only.
 *
 * Sends the service key only in the `apikey` header. PostgREST prefers
 * `Authorization: Bearer` over `apikey`, so a forwarded user JWT (e.g. from
 * clock skew) would override the service role and fail with "JWT issued at
 * future". `sb_secret_` keys must not be used as Bearer tokens either.
 */
/**
 * Auth admin client. GoTrue requires the service key as a Bearer token.
 * Database reads stay on {@link createSupabaseAdminClient}, which strips
 * Authorization so a user JWT cannot override the service role.
 */
export function createSupabaseAuthAdminClient(): SupabaseClient {
  const url = getSupabaseUrl();
  const key = getSupabaseServiceRoleKey();

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export function createSupabaseAdminClient(): SupabaseClient {
  const url = getSupabaseUrl();
  const key = getSupabaseServiceRoleKey();

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      skipAutoInitialize: true,
    },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        headers.set("apikey", key);
        headers.delete("Authorization");
        return fetch(input, { ...init, headers });
      },
    },
  });
}
