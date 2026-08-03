/** GoTrue rejects new publishable keys sent as `Authorization: Bearer`. */
export function createAuthSafeFetch(supabaseKey: string): typeof fetch {
  const publishableBearer = `Bearer ${supabaseKey}`;
  const stripPublishableBearer = supabaseKey.startsWith("sb_publishable_");

  return async (input, init) => {
    const headers = new Headers(init?.headers);
    if (!headers.has("apikey")) {
      headers.set("apikey", supabaseKey);
    }
    // Only strip the anon/publishable key — keep user session JWTs for getUser().
    if (
      stripPublishableBearer &&
      headers.get("Authorization") === publishableBearer
    ) {
      headers.delete("Authorization");
    }
    return fetch(input, { ...init, headers });
  };
}
