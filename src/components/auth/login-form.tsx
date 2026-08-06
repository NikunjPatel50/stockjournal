"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import {
  resendVerificationAction,
  resetPasswordWithOtpAction,
  sendResetPasswordAction,
  signInAction,
  signUpAction,
  verifyEmailAction,
} from "@/app/actions/auth";
import { PasswordStrength } from "@/components/auth/password-strength";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { isPasswordValid, getPasswordValidationError } from "@/lib/password-validation";
import {
  clearRememberedLogin,
  loadRememberedLogin,
  saveRememberedLogin,
} from "@/lib/remember-credentials";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

const LOGIN_FIELD_CLASS =
  "h-10 border-input bg-background text-foreground shadow-none placeholder:text-muted-foreground focus-visible:border-emerald-600 focus-visible:ring-emerald-600/20 dark:border-input dark:bg-background";

const LOGIN_LABEL_CLASS = "text-xs font-medium text-foreground";

const LOGIN_PASSWORD_TOGGLE_CLASS =
  "text-muted-foreground hover:text-foreground";

type Mode = "signin" | "signup" | "verify" | "forgot" | "reset";

const OAUTH_ERRORS: Record<string, string> = {
  oauth_failed: "Google sign-in failed. Please try again.",
  missing_verifier: "Google sign-in session expired. Please try again.",
  exchange_failed: "Could not complete Google sign-in. Please try again.",
};

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const oauthVerify = searchParams.get("oauth") === "1";
  const nextPath = searchParams.get("next");
  const googleAuthHref = nextPath
    ? `/api/auth/google?next=${encodeURIComponent(nextPath)}`
    : "/api/auth/google";
  const googlePickAccountHref = nextPath
    ? `/api/auth/google?pick_account=1&next=${encodeURIComponent(nextPath)}`
    : "/api/auth/google?pick_account=1";

  useEffect(() => {
    const remembered = loadRememberedLogin();
    if (remembered) {
      setEmail(remembered.email);
      setPassword(remembered.password);
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    const oauthError = searchParams.get("error");
    if (oauthError) {
      setError(OAUTH_ERRORS[oauthError] ?? decodeURIComponent(oauthError));
    }

    const verifyEmail = searchParams.get("verify");
    if (verifyEmail) {
      setEmail(verifyEmail);
      setMode("verify");
    }

    const message = searchParams.get("message");
    if (message) {
      toast.message(decodeURIComponent(message));
    }
  }, [searchParams]);

  function afterAuth() {
    const next = searchParams.get("next");
    router.replace(
      next && next.startsWith("/") && next !== "/" ? next : "/dashboard"
    );
    router.refresh();
  }

  const signupPasswordReady =
    isPasswordValid(password) && password === confirmPassword;
  const resetPasswordReady =
    isPasswordValid(newPassword) && newPassword === confirmPassword;

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      if (mode === "signin") {
        const result = await signInAction({ email, password });
        if (!result.ok) {
          setError(result.error);
          if (result.needsVerification) {
            setMode("verify");
            toast.message("Enter the 6-digit code from your email");
          }
          return;
        }
        if (rememberMe) {
          saveRememberedLogin(email, password);
        } else {
          clearRememberedLogin();
        }
        toast.success("Welcome back");
        afterAuth();
        return;
      }

      if (mode === "signup") {
        if (!isPasswordValid(password)) {
          setError(
            getPasswordValidationError(password) ??
              "Please meet all password requirements below"
          );
          return;
        }
        if (password !== confirmPassword) {
          setError("Passwords do not match");
          return;
        }
        const result = await signUpAction({ email, password, name });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setOtp("");
        setMode("verify");
        toast.message("Enter the 6-digit code we emailed you");
        return;
      }

      if (mode === "verify") {
        const result = await verifyEmailAction({ email, otp });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        toast.success("Email verified");
        afterAuth();
        return;
      }

      if (mode === "forgot") {
        const result = await sendResetPasswordAction({ email });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setOtp("");
        setNewPassword("");
        setConfirmPassword("");
        setMode("reset");
        toast.message("Enter the 6-digit reset code from your email");
        return;
      }

      if (mode === "reset") {
        if (!isPasswordValid(newPassword)) {
          setError(
            getPasswordValidationError(newPassword) ??
              "Please meet all password requirements below"
          );
          return;
        }
        if (newPassword !== confirmPassword) {
          setError("Passwords do not match");
          return;
        }
        const result = await resetPasswordWithOtpAction({
          email,
          code: otp,
          newPassword,
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        toast.success("Password updated. Sign in with your new password.");
        setPassword("");
        setOtp("");
        setNewPassword("");
        setConfirmPassword("");
        setMode("signin");
      }
    });
  }

  function onResendCode() {
    setError(null);
    startTransition(async () => {
      const result = await resendVerificationAction({ email });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success("A new verification code was sent");
    });
  }

  function onResendResetCode() {
    setError(null);
    startTransition(async () => {
      const result = await sendResetPasswordAction({ email });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success("A new reset code was sent");
    });
  }

  const title =
    mode === "signin"
      ? "Welcome back"
      : mode === "signup"
        ? "Create your account"
        : mode === "verify"
          ? "Verify your email"
          : mode === "forgot"
            ? "Reset your password"
            : "Set a new password";

  const subtitle =
    mode === "signin"
      ? "Sign in to your trading journal"
      : mode === "signup"
        ? "We'll email a 6-digit code to verify your account"
        : mode === "verify"
          ? oauthVerify
            ? `Google sign-in succeeded. Enter the 6-digit code we sent to ${email || "your email"} to finish setting up your account.`
            : `Enter the 6-digit code sent to ${email || "your email"}`
          : mode === "forgot"
            ? "We'll email a 6-digit code to reset your password"
            : `Enter the code sent to ${email} and choose a new password`;

  const showAuthTabs = mode === "signin" || mode === "signup";

  return (
    <div className="rounded-xl border border-border bg-card px-5 pt-4 pb-5 text-card-foreground shadow-[0_4px_6px_-2px_rgba(0,0,0,0.06),0_16px_40px_-12px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.45),0_0_48px_-12px_rgba(16,185,129,0.08)] sm:px-6 sm:pt-4 sm:pb-6">
      <div className="mb-1 flex w-full justify-center [&_picture]:h-[5.5rem] sm:[&_picture]:h-[7.25rem]">
        <BrandLogo
          lockup
          size="lg"
          lockupHeight={116}
          priority
          logoTheme="auto"
        />
      </div>

      <header className="mb-3 text-center">
        <h2 className="text-lg font-semibold leading-tight tracking-[-0.02em] text-foreground sm:text-xl">
          {title}
        </h2>
        <p className="mt-0.5 text-sm leading-snug tracking-tight text-muted-foreground">
          {subtitle}
        </p>
      </header>

      {showAuthTabs ? (
        <div
          className="mb-4 flex h-10 rounded-lg bg-muted/60 p-1 ring-1 ring-border/50"
          role="tablist"
          aria-label="Authentication mode"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signin"}
            className={cn(
              "flex-1 rounded-[6px] text-sm font-medium transition-all",
              mode === "signin"
                ? "bg-background text-foreground shadow-sm ring-1 ring-border/70"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => {
              setError(null);
              setConfirmPassword("");
              setMode("signin");
            }}
          >
            Sign in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signup"}
            className={cn(
              "flex-1 rounded-[6px] text-sm font-medium transition-all",
              mode === "signup"
                ? "bg-background text-foreground shadow-sm ring-1 ring-border/70"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => {
              setError(null);
              setConfirmPassword("");
              setMode("signup");
            }}
          >
            Create account
          </button>
        </div>
      ) : null}

      {(mode === "signin" || mode === "signup") && (
        <>
          <a
            href={googleAuthHref}
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "h-10 w-full gap-2.5 border-border bg-background text-sm font-medium text-foreground shadow-none hover:bg-muted/60"
            )}
          >
            <GoogleIcon className="size-4" />
            Continue with Google
          </a>
          <a
            href={googlePickAccountHref}
            className="mt-2 block w-full text-center text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Use a different Google account
          </a>

          <p className="my-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Or
          </p>
        </>
      )}

      <form onSubmit={onSubmit} className="space-y-3">
        {mode === "signup" && (
          <div className="space-y-1.5">
            <Label htmlFor="name" className={LOGIN_LABEL_CLASS}>
              Name
            </Label>
            <Input
              id="name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className={LOGIN_FIELD_CLASS}
              required
            />
          </div>
        )}

        {(mode === "signin" ||
          mode === "signup" ||
          mode === "forgot" ||
          ((mode === "verify" || mode === "reset") && !email)) && (
          <div className="space-y-1.5">
            <Label htmlFor="email" className={LOGIN_LABEL_CLASS}>
              Email
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={LOGIN_FIELD_CLASS}
              required
            />
          </div>
        )}

        {(mode === "signin" || mode === "signup") && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="password" className={LOGIN_LABEL_CLASS}>
                Password
              </Label>
              {mode === "signin" && (
                <button
                  type="button"
                  className="text-xs font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
                  onClick={() => {
                    setError(null);
                    setMode("forgot");
                  }}
                >
                  Forgot password?
                </button>
              )}
            </div>
            <PasswordInput
              id="password"
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={
                mode === "signup"
                  ? "Create a strong password"
                  : "Your password"
              }
              className={LOGIN_FIELD_CLASS}
              toggleClassName={LOGIN_PASSWORD_TOGGLE_CLASS}
              minLength={mode === "signup" ? 8 : undefined}
              required
            />
            {mode === "signup" && (
              <PasswordStrength password={password} alwaysShow />
            )}
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="signupConfirmPassword" className={LOGIN_LABEL_CLASS}>
                  Confirm password
                </Label>
                <PasswordInput
                  id="signupConfirmPassword"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  className={LOGIN_FIELD_CLASS}
                  toggleClassName={LOGIN_PASSWORD_TOGGLE_CLASS}
                  minLength={8}
                  required
                />
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-destructive">Passwords do not match</p>
                )}
              </div>
            )}
            {mode === "signin" && (
              <label className="flex cursor-pointer items-center gap-2.5 pt-1">
                <Checkbox
                  checked={rememberMe}
                  onCheckedChange={(checked) => {
                    const enabled = checked === true;
                    setRememberMe(enabled);
                    if (!enabled) clearRememberedLogin();
                  }}
                />
                <span className="text-sm text-muted-foreground">Remember me</span>
              </label>
            )}
          </div>
        )}

        {(mode === "verify" || mode === "reset") && (
          <div className="space-y-2">
            <Label htmlFor="otp" className={LOGIN_LABEL_CLASS}>
              6-digit code
            </Label>
            <Input
              id="otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={otp}
              onChange={(e) =>
                setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="123456"
              className={cn(LOGIN_FIELD_CLASS, "tracking-[0.35em]")}
              maxLength={6}
              required
            />
          </div>
        )}

        {mode === "reset" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="newPassword" className={LOGIN_LABEL_CLASS}>
                New password
              </Label>
              <PasswordInput
                id="newPassword"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Create a strong password"
                className={LOGIN_FIELD_CLASS}
                toggleClassName={LOGIN_PASSWORD_TOGGLE_CLASS}
                minLength={8}
                required
              />
              <PasswordStrength password={newPassword} alwaysShow />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className={LOGIN_LABEL_CLASS}>
                Confirm password
              </Label>
              <PasswordInput
                id="confirmPassword"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className={LOGIN_FIELD_CLASS}
                toggleClassName={LOGIN_PASSWORD_TOGGLE_CLASS}
                minLength={8}
                required
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-destructive">Passwords do not match</p>
              )}
            </div>
          </>
        )}

        {error && (
          <p className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
            {error}
          </p>
        )}

        <Button
          type="submit"
          className="h-10 w-full bg-emerald-600 text-sm font-medium text-white shadow-sm hover:bg-emerald-500 dark:bg-emerald-600 dark:hover:bg-emerald-500"
          disabled={
            pending ||
            (mode === "signup" && !signupPasswordReady) ||
            (mode === "reset" && !resetPasswordReady)
          }
        >
          {pending && <Loader2 className="size-4 animate-spin" />}
          {mode === "signin" && "Sign in"}
          {mode === "signup" && "Create account"}
          {mode === "verify" && "Verify email"}
          {mode === "forgot" && "Send reset code"}
          {mode === "reset" && "Update password"}
        </Button>
      </form>

      {mode === "verify" && (
        <button
          type="button"
          className="mt-3 w-full text-center text-sm font-medium text-foreground underline-offset-4 hover:underline disabled:opacity-50"
          disabled={pending || !email}
          onClick={onResendCode}
        >
          Resend verification code
        </button>
      )}

      {mode === "reset" && (
        <button
          type="button"
          className="mt-3 w-full text-center text-sm font-medium text-foreground underline-offset-4 hover:underline disabled:opacity-50"
          disabled={pending || !email}
          onClick={onResendResetCode}
        >
          Resend reset code
        </button>
      )}

      {(mode === "verify" || mode === "forgot" || mode === "reset") && (
        <div className="mt-6 text-center text-sm text-muted-foreground">
          <button
            type="button"
            className={cn(
              "font-medium text-foreground underline-offset-4 hover:underline",
              pending && "pointer-events-none opacity-50"
            )}
            onClick={() => {
              setError(null);
              setOtp("");
              setNewPassword("");
              setConfirmPassword("");
              setMode("signin");
            }}
          >
            Back to sign in
          </button>
        </div>
      )}

      <p className="mt-4 flex items-center justify-center gap-1.5 border-t border-border pt-3 text-center text-[11px] text-muted-foreground">
        <Lock className="size-3 shrink-0 opacity-70" aria-hidden />
        Your data is encrypted in transit
      </p>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
