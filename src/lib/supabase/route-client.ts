import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import { createAuthSafeFetch } from "@/lib/supabase/auth-fetch";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

type CookieToSet = {
  name: string;
  value: string;
  options?: Parameters<NextResponse["cookies"]["set"]>[2];
};

function createCookieBackedSupabaseClient(
  getAll: () => ReturnType<NextRequest["cookies"]["getAll"]>,
  setAll: (cookiesToSet: CookieToSet[]) => void
) {
  const supabaseKey = getSupabaseAnonKey();

  return createServerClient(getSupabaseUrl(), supabaseKey, {
    global: {
      fetch: createAuthSafeFetch(supabaseKey),
    },
    cookies: {
      getAll,
      setAll,
    },
  });
}

/** Apply auth cookies captured during an OAuth route handler onto the outgoing response. */
export function applyAuthCookiesToResponse(
  response: NextResponse,
  cookiesToSet: CookieToSet[]
) {
  for (const { name, value, options } of cookiesToSet) {
    if (value) {
      response.cookies.set(name, value, options);
    } else {
      response.cookies.set(name, "", { ...options, maxAge: 0 });
    }
  }
}

/**
 * Supabase client for OAuth route handlers.
 * Cookies are buffered and must be applied to the redirect response before returning.
 */
export function createSupabaseOAuthRouteClient(request: NextRequest) {
  const pendingCookies: CookieToSet[] = [];

  const supabase = createCookieBackedSupabaseClient(
    () => request.cookies.getAll(),
    (cookiesToSet) => {
      for (const cookie of cookiesToSet) {
        const index = pendingCookies.findIndex((item) => item.name === cookie.name);
        if (index >= 0) {
          pendingCookies[index] = cookie;
        } else {
          pendingCookies.push(cookie);
        }
      }
    }
  );

  return {
    supabase,
    applyCookiesTo(response: NextResponse) {
      applyAuthCookiesToResponse(response, pendingCookies);
    },
  };
}
