/** GoTrue rejects new publishable keys sent as `Authorization: Bearer`. */
export function createAuthSafeFetch(supabaseKey: string): typeof fetch {
  const stripBearer = supabaseKey.startsWith("sb_publishable_");

  return async (input, init) => {
    const headers = new Headers(init?.headers);
    if (!headers.has("apikey")) {
      headers.set("apikey", supabaseKey);
    }
    if (stripBearer) {
      headers.delete("Authorization");
    }
    return fetch(input, { ...init, headers });
  };
}
