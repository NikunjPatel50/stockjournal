"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAuthActions, createServerClient } from "@insforge/sdk/ssr";
import { GOOGLE_OAUTH_HINT_COOKIE } from "@/lib/google-oauth-hint";

function appUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return new URL(path, base).toString();
}

function authErrorMessage(error: { message?: string } | null, fallback: string) {
  return error?.message?.trim() || fallback;
}

async function getAuthClient() {
  return createServerClient({
    cookies: await cookies(),
  });
}

export async function signInAction(input: {
  email: string;
  password: string;
}) {
  const auth = createAuthActions({ cookies: await cookies() });
  const { data, error } = await auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });

  if (error || !data?.user) {
    return {
      ok: false as const,
      error: authErrorMessage(error, "Sign in failed"),
      statusCode: error?.statusCode,
      needsVerification: error?.statusCode === 403,
    };
  }

  if (data.user.emailVerified === false) {
    await auth.signOut();
    const client = await getAuthClient();
    await client.auth.resendVerificationEmail({
      email: input.email,
      redirectTo: appUrl("/login"),
    });
    return {
      ok: false as const,
      error: "Verify your email with the 6-digit code we sent you.",
      statusCode: 403,
      needsVerification: true,
    };
  }

  return { ok: true as const, user: data.user };
}

export async function signUpAction(input: {
  email: string;
  password: string;
  name: string;
}) {
  const auth = createAuthActions({ cookies: await cookies() });
  const { data, error } = await auth.signUp({
    email: input.email,
    password: input.password,
    name: input.name,
    redirectTo: appUrl("/login"),
  });

  if (error) {
    return {
      ok: false as const,
      error: authErrorMessage(error, "Sign up failed"),
    };
  }

  if (!data?.user) {
    return { ok: false as const, error: "Sign up failed" };
  }

  // Email sign-up always completes on the login page with a 6-digit code.
  await auth.signOut();

  const client = await getAuthClient();
  const { error: resendError } = await client.auth.resendVerificationEmail({
    email: input.email,
    redirectTo: appUrl("/login"),
  });

  if (resendError) {
    return {
      ok: false as const,
      error: authErrorMessage(
        resendError,
        "Account created but we could not send a verification code. Try again shortly."
      ),
    };
  }

  return {
    ok: true as const,
    requireEmailVerification: true as const,
    email: input.email,
  };
}

export async function verifyEmailAction(input: {
  email: string;
  otp: string;
}) {
  const auth = createAuthActions({ cookies: await cookies() });
  const { data, error } = await auth.verifyEmail({
    email: input.email,
    otp: input.otp,
  });

  if (error || !data?.user) {
    return {
      ok: false as const,
      error: authErrorMessage(error, "Invalid or expired verification code"),
    };
  }

  return { ok: true as const, user: data.user };
}

export async function resendVerificationAction(input: { email: string }) {
  const client = await getAuthClient();
  const { error } = await client.auth.resendVerificationEmail({
    email: input.email,
    redirectTo: appUrl("/login"),
  });

  if (error) {
    return {
      ok: false as const,
      error: authErrorMessage(error, "Could not resend verification code"),
    };
  }

  return { ok: true as const };
}

export async function sendResetPasswordAction(input: { email: string }) {
  const client = await getAuthClient();
  const { error } = await client.auth.sendResetPasswordEmail({
    email: input.email,
    redirectTo: appUrl("/login"),
  });

  if (error) {
    return {
      ok: false as const,
      error: authErrorMessage(error, "Could not send reset code"),
    };
  }

  return { ok: true as const };
}

export async function resetPasswordWithOtpAction(input: {
  email: string;
  code: string;
  newPassword: string;
}) {
  const client = await getAuthClient();
  const { data, error } = await client.auth.exchangeResetPasswordToken({
    email: input.email,
    code: input.code,
  });

  if (error || !data?.token) {
    return {
      ok: false as const,
      error: authErrorMessage(error, "Invalid or expired reset code"),
    };
  }

  const { error: resetError } = await client.auth.resetPassword({
    newPassword: input.newPassword,
    otp: data.token,
  });

  if (resetError) {
    return {
      ok: false as const,
      error: authErrorMessage(resetError, "Could not reset password"),
    };
  }

  return { ok: true as const };
}

export async function changePasswordAction(input: {
  code: string;
  newPassword: string;
}) {
  const client = await getAuthClient();
  const { data: userData, error: userError } =
    await client.auth.getCurrentUser();

  if (userError || !userData?.user?.email) {
    return {
      ok: false as const,
      error: "You must be signed in to change your password",
    };
  }

  return resetPasswordWithOtpAction({
    email: userData.user.email,
    code: input.code,
    newPassword: input.newPassword,
  });
}

export async function sendChangePasswordCodeAction() {
  const client = await getAuthClient();
  const { data: userData, error: userError } =
    await client.auth.getCurrentUser();

  if (userError || !userData?.user?.email) {
    return {
      ok: false as const,
      error: "You must be signed in to change your password",
    };
  }

  const result = await sendResetPasswordAction({
    email: userData.user.email,
  });

  if (!result.ok) return result;

  return { ok: true as const, email: userData.user.email };
}

export async function signOutAction() {
  const auth = createAuthActions({ cookies: await cookies() });
  await auth.signOut();
  redirect("/login");
}

export async function initiateOAuthAction(options?: { pickAccount?: boolean }) {
  const cookieStore = await cookies();
  const auth = createAuthActions({ cookies: cookieStore });

  const loginHint = cookieStore.get(GOOGLE_OAUTH_HINT_COOKIE)?.value?.trim();
  const additionalParams: Record<string, string> = {};

  if (options?.pickAccount) {
    additionalParams.prompt = "select_account";
  } else if (loginHint) {
    additionalParams.login_hint = loginHint;
  }

  const { data, error } = await auth.signInWithOAuth("google", {
    redirectTo: appUrl("/api/auth/callback"),
    skipBrowserRedirect: true,
    ...(Object.keys(additionalParams).length > 0
      ? { additionalParams }
      : {}),
  });

  if (error || !data?.url || !data.codeVerifier) {
    redirect(
      `/login?error=${encodeURIComponent(error?.message ?? "OAuth init failed")}`
    );
  }

  cookieStore.set("insforge_code_verifier", data.codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  redirect(data.url);
}
