/** Post-login redirect path (e.g. /admin) preserved across OAuth. */
export const AUTH_NEXT_COOKIE = "stl_auth_next";

export const AUTH_NEXT_MAX_AGE = 60 * 10;

export function sanitizeAuthNextPath(next: string | null | undefined): string | null {
  if (!next) return null;
  const trimmed = next.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  if (trimmed === "/login") return null;
  return trimmed;
}
