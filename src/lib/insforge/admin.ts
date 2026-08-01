import { createAdminClient } from "@insforge/sdk";

export function createInsForgeAdminClient() {
  const baseUrl =
    process.env.INSFORGE_URL?.trim() ||
    process.env.NEXT_PUBLIC_INSFORGE_URL?.trim();
  const apiKey = process.env.INSFORGE_API_KEY?.trim();

  if (!baseUrl || !apiKey) {
    throw new Error(
      "Admin API is not configured. Set INSFORGE_API_KEY (and INSFORGE_URL if needed) in .env.local."
    );
  }

  if (apiKey.startsWith("anon_")) {
    throw new Error(
      "INSFORGE_API_KEY is set to the anon key. Use the project API key instead: npx @insforge/cli secrets get API_KEY"
    );
  }

  return createAdminClient({ baseUrl, apiKey });
}
