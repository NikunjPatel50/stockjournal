/** True when Supabase rejected a JWT because the client clock is ahead of the server. */
export function isJwtClockSkewError(message: string | undefined): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes("issued at future") ||
    lower.includes("issued in the future") ||
    lower.includes("token-not-active-yet")
  );
}
