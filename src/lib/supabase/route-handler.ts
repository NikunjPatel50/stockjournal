import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { createAuthSafeFetch } from "@/lib/supabase/auth-fetch";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

type RouteHandlerSupabase = {
  supabase: ReturnType<typeof createServerClient>;
  /** Response carrying any auth cookies set during the handler. */
  getCookieResponse: () => NextResponse;
  /** Redirect and forward auth cookies set on the handler response. */
  redirect: (url: string | URL) => NextResponse;
};

/** Supabase client for Route Handlers — mirrors the proxy.ts cookie pattern. */
export function createRouteHandlerSupabase(
  request: NextRequest
): RouteHandlerSupabase {
  let cookieResponse = NextResponse.next({ request });
  const supabaseKey = getSupabaseAnonKey();

  const supabase = createServerClient(getSupabaseUrl(), supabaseKey, {
    global: {
      fetch: createAuthSafeFetch(supabaseKey),
    },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        cookieResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  return {
    supabase,
    getCookieResponse: () => cookieResponse,
    redirect(url) {
      const redirectResponse = NextResponse.redirect(url);
      cookieResponse.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie.name, cookie.value);
      });
      return redirectResponse;
    },
  };
}
