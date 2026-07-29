"use client";

import { Check, X } from "lucide-react";
import {
  getPasswordRuleResults,
  getPasswordStrength,
  STRENGTH_COLORS,
  STRENGTH_LABELS,
  STRENGTH_WIDTH,
} from "@/lib/password-validation";
import { cn } from "@/lib/utils";

export function PasswordStrength({
  password,
  alwaysShow = false,
}: {
  password: string;
  alwaysShow?: boolean;
}) {
  const strength = getPasswordStrength(password);
  const rules = getPasswordRuleResults(password);
  const isStrong = strength === "strong";

  if (!password && !alwaysShow) return null;

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Password strength</span>
          {password && strength !== "empty" ? (
            <span
              className={cn(
                "font-medium",
                strength === "weak" && "text-red-500",
                strength === "fair" && "text-orange-500",
                strength === "good" && "text-yellow-600 dark:text-yellow-500",
                strength === "strong" && "text-emerald-500"
              )}
            >
              {STRENGTH_LABELS[strength]}
            </span>
          ) : (
            <span className="font-medium text-muted-foreground">Required</span>
          )}
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          {password && strength !== "empty" ? (
            <div
              className={cn(
                "h-full rounded-full transition-all duration-300",
                STRENGTH_COLORS[strength],
                STRENGTH_WIDTH[strength]
              )}
            />
          ) : null}
        </div>
      </div>

      {!isStrong && password && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Use a strong password that meets every requirement below.
        </p>
      )}

      <ul className="space-y-1">
        {rules.map((rule) => (
          <li
            key={rule.id}
            className={cn(
              "flex items-center gap-2 text-xs transition-colors",
              rule.passed ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
            )}
          >
            {rule.passed ? (
              <Check className="size-3.5 shrink-0" aria-hidden />
            ) : (
              <X className="size-3.5 shrink-0 opacity-60" aria-hidden />
            )}
            <span>{rule.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
