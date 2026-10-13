import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isJwtClockSkewError } from "@/lib/supabase/auth-errors";
import {
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
} from "@/lib/supabase/env";

/**
 * The API gateway exchanges `sb_secret_` for a short-lived JWT. PostgREST
 * intermittently rejects that token with "JWT issued at future" (PGRST303)
 * even though this client never minted a JWT. A later attempt usually
 * reaches a healthy instance.
 */
const JWT_SKEW_RETRY_MS = [400, 1200, 3000];

function serviceRoleFetch(
  key: string,
  mode: "database" | "auth"
): typeof fetch {
  return async (input, init) => {
    const send = () => {
      const headers = new Headers(init?.headers);
      headers.set("apikey", key);
      if (mode === "database") {
        // PostgREST prefers Authorization over apikey. A user session JWT
        // forwarded onto this request would override the service role.
        headers.delete("Authorization");
      }
      return fetch(input, { ...init, headers, cache: "no-store" });
    };

    let response = await send();
    for (const delayMs of JWT_SKEW_RETRY_MS) {
      if (response.status !== 401 && response.status !== 403) return response;
      const body = await response.clone().text();
      if (!isJwtClockSkewError(body)) return response;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      response = await send();
    }
    return response;
  };
}

/**
 * Auth admin client. GoTrue requires the service key as a Bearer token.
 * Database reads stay on {@link createSupabaseAdminClient}.
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
    global: {
      fetch: serviceRoleFetch(key, "auth"),
    },
  });
}

/**
 * Service-role client for /admin (bypasses RLS). Server-only.
 * Sends the service key only in the `apikey` header.
 */
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
      fetch: serviceRoleFetch(key, "database"),
    },
  });
}
