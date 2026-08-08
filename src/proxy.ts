import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isPublicPath } from "@/lib/public-paths";
import { createAuthSafeFetch } from "@/lib/supabase/auth-fetch";
import { isJwtClockSkewError } from "@/lib/supabase/auth-errors";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

function withNoIndex(response: NextResponse) {
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const supabaseKey = getSupabaseAnonKey();

  const supabase = createServerClient(
    getSupabaseUrl(),
    supabaseKey,
    {
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
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  let {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (!user && isJwtClockSkewError(authError?.message)) {
    await supabase.auth.refreshSession();
    ({
      data: { user },
    } = await supabase.auth.getUser());
  }

  const { pathname } = request.nextUrl;

  if (!user && !isPublicPath(pathname)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return withNoIndex(NextResponse.redirect(loginUrl));
  }

  if (user && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (pathname === "/login" || pathname.startsWith("/login/")) {
    return withNoIndex(supabaseResponse);
  }

  if (!isPublicPath(pathname)) {
    return withNoIndex(supabaseResponse);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
