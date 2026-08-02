"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { MARKETING_NAV_LINKS } from "@/lib/marketing-nav";
import { cn } from "@/lib/utils";

export function LandingNavbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border/80 bg-background/95 text-foreground backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
          <Link href="/" className="inline-flex shrink-0 items-center">
            <BrandLogo
              size="sm"
              markSize="md"
              priority
              framedMark={false}
              logoTheme="auto"
              showWordmark
              className="max-[400px]:[&>span:last-child]:hidden"
            />
          </Link>

          <nav className="hidden items-center gap-0.5 lg:flex xl:gap-1">
            {MARKETING_NAV_LINKS.map((link) => {
              const active =
                pathname === link.href ||
                pathname.startsWith(`${link.href}/`);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "rounded-md px-2 py-2 text-sm transition-colors xl:px-3",
                    active
                      ? "font-medium text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden shrink-0 items-center gap-1.5 lg:flex">
            <ThemeToggle />
            <Link href="/login">
              <Button variant="ghost" className="text-muted-foreground">
                Sign In
              </Button>
            </Link>
            <Link href="/login">
              <Button className="bg-emerald-500 text-zinc-950 hover:bg-emerald-400">
                Start free
              </Button>
            </Link>
          </div>

          <div className="flex shrink-0 items-center gap-2 lg:hidden">
            <ThemeToggle />
            <button
              type="button"
              className="inline-flex size-11 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={() => setOpen((v) => !v)}
              aria-label="Toggle menu"
              aria-expanded={open}
            >
              {open ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
          </div>
        </div>

        <div
          className={cn(
            "border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:hidden",
            open ? "block" : "hidden"
          )}
        >
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
            {MARKETING_NAV_LINKS.map((link) => {
              const active = pathname === link.href;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm hover:bg-muted hover:text-foreground",
                    active
                      ? "font-medium text-foreground"
                      : "text-muted-foreground"
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  {link.label}
                </Link>
              );
            })}
            <div className="mt-2 flex flex-col gap-2 border-t border-border pt-3">
              <Link href="/login" onClick={() => setOpen(false)}>
                <Button variant="outline" className="w-full">
                  Sign In
                </Button>
              </Link>
              <Link href="/login" onClick={() => setOpen(false)}>
                <Button className="w-full bg-emerald-500 text-zinc-950 hover:bg-emerald-400">
                  Get Started Free
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>
      <div aria-hidden className="h-14 shrink-0 sm:h-16" />
    </>
  );
}
