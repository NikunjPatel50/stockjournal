import { cookies } from "next/headers";
import { createServerClient } from "@insforge/sdk/ssr";

export async function createInsForgeServerClient() {
  return createServerClient({
    cookies: await cookies(),
  });
}

export async function getCurrentUser() {
  const client = await createInsForgeServerClient();
  const { data, error } = await client.auth.getCurrentUser();
  if (error || !data?.user) return null;
  return data.user;
}
