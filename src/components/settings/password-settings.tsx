"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  changePasswordAction,
  sendChangePasswordCodeAction,
} from "@/app/actions/auth";
import { PasswordStrength } from "@/components/auth/password-strength";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { isPasswordValid, getPasswordValidationError } from "@/lib/password-validation";

export function PasswordSettings() {
  const [step, setStep] = useState<"idle" | "code">("idle");
  const [email, setEmail] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function sendCode() {
    setError(null);
    startTransition(async () => {
      const result = await sendChangePasswordCodeAction();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEmail(result.email);
      setStep("code");
      toast.message("Enter the 6-digit code we emailed you");
    });
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!isPasswordValid(newPassword)) {
      setError(
        getPasswordValidationError(newPassword) ??
          "Please meet all password requirements"
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    startTransition(async () => {
      const result = await changePasswordAction({
        code,
        newPassword,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success("Password updated");
      setStep("idle");
      setCode("");
      setNewPassword("");
      setConfirmPassword("");
    });
  }

  const passwordReady =
    isPasswordValid(newPassword) && newPassword === confirmPassword;

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle>Password</CardTitle>
        <CardDescription>
          Change your password with a 6-digit code sent to your email
        </CardDescription>
      </CardHeader>

      {step === "idle" ? (
        <>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              We&apos;ll email a one-time code to confirm it&apos;s you, then you
              can set a new password.
            </p>
            {error && (
              <p className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-destructive">
                {error}
              </p>
            )}
          </CardContent>
          <CardFooter>
            <Button
              type="button"
              className="bg-emerald-600 hover:bg-emerald-600/90"
              disabled={pending}
              onClick={sendCode}
            >
              {pending && <Loader2 className="size-4 animate-spin" />}
              Send verification code
            </Button>
          </CardFooter>
        </>
      ) : (
        <form onSubmit={onSubmit}>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Code sent to{" "}
              <span className="font-medium text-foreground">
                {email ?? "your email"}
              </span>
            </p>
            <div className="space-y-2">
              <Label htmlFor="settings-otp">6-digit code</Label>
              <Input
                id="settings-otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="123456"
                maxLength={6}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-new-password">New password</Label>
              <PasswordInput
                id="settings-new-password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Create a strong password"
                minLength={8}
                required
              />
              <PasswordStrength password={newPassword} alwaysShow />
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-confirm-password">Confirm password</Label>
              <PasswordInput
                id="settings-confirm-password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                minLength={8}
                required
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-destructive">Passwords do not match</p>
              )}
            </div>
            {error && (
              <p className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
          </CardContent>
          <CardFooter className="flex flex-wrap gap-2">
            <Button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-600/90"
              disabled={pending || !passwordReady}
            >
              {pending && <Loader2 className="size-4 animate-spin" />}
              Update password
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={sendCode}
            >
              Resend code
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              onClick={() => {
                setStep("idle");
                setError(null);
                setCode("");
                setNewPassword("");
                setConfirmPassword("");
              }}
            >
              Cancel
            </Button>
          </CardFooter>
        </form>
      )}
    </Card>
  );
}
