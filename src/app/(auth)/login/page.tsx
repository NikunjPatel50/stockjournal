import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { getSeoMetadata } from "@/lib/seo-pages";

export const metadata: Metadata = getSeoMetadata("login");

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
