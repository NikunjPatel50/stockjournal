export type PasswordStrength = "empty" | "weak" | "fair" | "good" | "strong";

export type PasswordRule = {
  id: string;
  label: string;
  test: (password: string) => boolean;
};

export const PASSWORD_RULES: PasswordRule[] = [
  {
    id: "length",
    label: "At least 8 characters",
    test: (password) => password.length >= 8,
  },
  {
    id: "uppercase",
    label: "One uppercase letter",
    test: (password) => /[A-Z]/.test(password),
  },
  {
    id: "lowercase",
    label: "One lowercase letter",
    test: (password) => /[a-z]/.test(password),
  },
  {
    id: "number",
    label: "One number",
    test: (password) => /\d/.test(password),
  },
  {
    id: "special",
    label: "One special character",
    test: (password) => /[^A-Za-z0-9]/.test(password),
  },
];

export function getPasswordRuleResults(password: string) {
  return PASSWORD_RULES.map((rule) => ({
    ...rule,
    passed: rule.test(password),
  }));
}

export function isPasswordValid(password: string) {
  return isPasswordStrong(password);
}

export function isPasswordStrong(password: string) {
  return getPasswordStrength(password) === "strong";
}

export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return "empty";

  const passed = PASSWORD_RULES.filter((rule) => rule.test(password)).length;

  if (passed <= 2) return "weak";
  if (passed === 3) return "fair";
  if (passed === 4) return "good";
  return "strong";
}

export function getPasswordValidationError(password: string) {
  if (isPasswordStrong(password)) return null;

  const failed = getPasswordRuleResults(password).filter((rule) => !rule.passed);
  if (failed.length === 0) {
    return "Password must be strong before continuing";
  }

  return `Password must include: ${failed.map((rule) => rule.label.toLowerCase()).join(", ")}`;
}

export const STRENGTH_LABELS: Record<
  Exclude<PasswordStrength, "empty">,
  string
> = {
  weak: "Weak",
  fair: "Fair",
  good: "Good",
  strong: "Strong",
};

export const STRENGTH_COLORS: Record<
  Exclude<PasswordStrength, "empty">,
  string
> = {
  weak: "bg-red-500",
  fair: "bg-orange-500",
  good: "bg-yellow-500",
  strong: "bg-emerald-500",
};

export const STRENGTH_WIDTH: Record<
  Exclude<PasswordStrength, "empty">,
  string
> = {
  weak: "w-1/4",
  fair: "w-2/4",
  good: "w-3/4",
  strong: "w-full",
};
