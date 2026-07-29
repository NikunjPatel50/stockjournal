import type { ReactNode } from "react";
import Link from "next/link";
import { LandingFooter } from "@/components/landing/footer";
import { LandingNavbar } from "@/components/landing/navbar";
import { SITE_NAME } from "@/lib/site";
import { cn } from "@/lib/utils";

export function LegalSection({
  title,
  children,
  id,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-border pt-8 first:border-t-0 first:pt-0">
      <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
        {children}
      </div>
    </section>
  );
}

export function LegalDocumentPage({
  title,
  effectiveDate,
  children,
}: {
  title: string;
  effectiveDate: string;
  children: ReactNode;
}) {
  return (
    <>
      <LandingNavbar />
      <main className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
        <Link
          href="/"
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Back to home
        </Link>
        <p className="mt-8 font-mono text-xs uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
          {SITE_NAME}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Effective date: {effectiveDate}
        </p>
        <div className={cn("mt-10 space-y-8")}>{children}</div>
      </main>
      <LandingFooter />
    </>
  );
}
