"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { href: "#features", label: "Features" },
  { href: "#analytics", label: "Analytics" },
  { href: "#pricing", label: "Pricing" },
  { href: "#roadmap", label: "Roadmap" },
  { href: "#faq", label: "FAQ" },
];

export function LandingNavbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background text-foreground">
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
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground xl:px-3"
            >
              {link.label}
            </a>
          ))}
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
            className="inline-flex size-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
          "border-t border-border bg-background lg:hidden",
          open ? "block" : "hidden"
        )}
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
          <div className="mt-2 flex flex-col gap-2 border-t border-border pt-3">
            <Link href="/login">
              <Button variant="outline" className="w-full">
                Sign In
              </Button>
            </Link>
            <Link href="/login">
              <Button className="w-full bg-emerald-500 text-zinc-950 hover:bg-emerald-400">
                Get Started Free
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
