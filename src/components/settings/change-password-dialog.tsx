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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { isPasswordValid, getPasswordValidationError } from "@/lib/password-validation";

export function ChangePasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [step, setStep] = useState<"idle" | "code">("idle");
  const [email, setEmail] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function resetState() {
    setStep("idle");
    setEmail(null);
    setCode("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    if (!next) resetState();
    onOpenChange(next);
  }

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
      const result = await changePasswordAction({ code, newPassword });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success("Password updated");
      handleOpenChange(false);
    });
  }

  const passwordReady =
    isPasswordValid(newPassword) && newPassword === confirmPassword;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change password</DialogTitle>
          <DialogDescription>
            Confirm with a 6-digit code sent to your email, then set a new
            password.
          </DialogDescription>
        </DialogHeader>

        {step === "idle" ? (
          <>
            {error && (
              <p className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-emerald-600 hover:bg-emerald-600/90"
                disabled={pending}
                onClick={sendCode}
              >
                {pending && <Loader2 className="size-4 animate-spin" />}
                Send code
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Code sent to{" "}
              <span className="font-medium text-foreground">
                {email ?? "your email"}
              </span>
            </p>
            <div className="space-y-2">
              <Label htmlFor="dialog-otp">6-digit code</Label>
              <Input
                id="dialog-otp"
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
              <Label htmlFor="dialog-new-password">New password</Label>
              <PasswordInput
                id="dialog-new-password"
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
              <Label htmlFor="dialog-confirm-password">Confirm password</Label>
              <PasswordInput
                id="dialog-confirm-password"
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
            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={sendCode}
              >
                Resend
              </Button>
              <Button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-600/90"
                disabled={pending || !passwordReady}
              >
                {pending && <Loader2 className="size-4 animate-spin" />}
                Update password
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
