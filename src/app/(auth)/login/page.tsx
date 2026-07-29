import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Sign in",
  description:
    "Sign in to your free SwingTradingLog swing trading journal — track trades, analytics, and goals.",
  path: "/login",
});

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-2xl border border-border/80 bg-card p-8 text-sm text-muted-foreground shadow-sm">
          Loading sign-in…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
