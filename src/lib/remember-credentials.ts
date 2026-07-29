const STORAGE_KEY = "stockjournal:remembered-login";

type RememberedLogin = {
  email: string;
  password: string;
};

export function loadRememberedLogin(): RememberedLogin | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as RememberedLogin;
    if (
      typeof parsed.email === "string" &&
      typeof parsed.password === "string" &&
      parsed.email.length > 0
    ) {
      return parsed;
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }

  return null;
}

export function saveRememberedLogin(email: string, password: string) {
  if (typeof window === "undefined") return;

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ email, password } satisfies RememberedLogin)
  );
}

export function clearRememberedLogin() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
