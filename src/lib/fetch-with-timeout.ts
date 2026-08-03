export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 5000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: init.signal ?? controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export function extractResponseCookies(response: Response): string {
  const fromGetSetCookie = response.headers.getSetCookie?.() ?? [];
  if (fromGetSetCookie.length > 0) {
    return fromGetSetCookie
      .map((entry) => entry.split(";")[0]?.trim())
      .filter(Boolean)
      .join("; ");
  }

  const raw = response.headers.get("set-cookie");
  if (!raw) return "";

  return raw
    .split(/,(?=[^;]+?=)/)
    .map((entry) => entry.split(";")[0]?.trim())
    .filter(Boolean)
    .join("; ");
}
