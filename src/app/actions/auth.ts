"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mapSupabaseUser } from "@/lib/supabase/types";

function appUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return new URL(path, base).toString();
}

function authErrorMessage(
  error: { message?: string } | null,
  fallback: string
) {
  return error?.message?.trim() || fallback;
}

function needsEmailVerification(message: string) {
  const lower = message.toLowerCase();
  return (
    lower.includes("email not confirmed") ||
    lower.includes("not verified") ||
    lower.includes("verify")
  );
}

export async function signInAction(input: {
  email: string;
  password: string;
}) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });

  if (error || !data.user) {
    const message = authErrorMessage(error, "Sign in failed");
    return {
      ok: false as const,
      error: message,
      needsVerification: needsEmailVerification(message),
    };
  }

  const user = mapSupabaseUser(data.user);
  if (!user.emailVerified) {
    await supabase.auth.signOut();
    await supabase.auth.resend({ type: "signup", email: input.email });
    return {
      ok: false as const,
      error: "Verify your email with the 6-digit code we sent you.",
      needsVerification: true,
    };
  }

  return { ok: true as const, user };
}

export async function signUpAction(input: {
  email: string;
  password: string;
  name: string;
}) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: { full_name: input.name },
      emailRedirectTo: appUrl("/login"),
    },
  });

  if (error) {
    return {
      ok: false as const,
      error: authErrorMessage(error, "Sign up failed"),
    };
  }

  if (!data.user) {
    return { ok: false as const, error: "Sign up failed" };
  }

  await supabase.auth.signOut();

  const { error: resendError } = await supabase.auth.resend({
    type: "signup",
    email: input.email,
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
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email: input.email,
    token: input.otp,
    type: "email",
  });

  if (error || !data.user) {
    const fallback = await supabase.auth.verifyOtp({
      email: input.email,
      token: input.otp,
      type: "signup",
    });
    if (fallback.error || !fallback.data.user) {
      return {
        ok: false as const,
        error: authErrorMessage(
          error ?? fallback.error,
          "Invalid or expired verification code"
        ),
      };
    }
    return { ok: true as const, user: mapSupabaseUser(fallback.data.user) };
  }

  return { ok: true as const, user: mapSupabaseUser(data.user) };
}

export async function resendVerificationAction(input: { email: string }) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: input.email,
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
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(input.email, {
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
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email: input.email,
    token: input.code,
    type: "recovery",
  });

  if (error || !data.session) {
    return {
      ok: false as const,
      error: authErrorMessage(error, "Invalid or expired reset code"),
    };
  }

  const { error: resetError } = await supabase.auth.updateUser({
    password: input.newPassword,
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
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.email) {
    return {
      ok: false as const,
      error: "You must be signed in to change your password",
    };
  }

  return resetPasswordWithOtpAction({
    email: user.email,
    code: input.code,
    newPassword: input.newPassword,
  });
}

export async function sendChangePasswordCodeAction() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.email) {
    return {
      ok: false as const,
      error: "You must be signed in to change your password",
    };
  }

  const result = await sendResetPasswordAction({ email: user.email });
  if (!result.ok) return result;

  return { ok: true as const, email: user.email };
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
