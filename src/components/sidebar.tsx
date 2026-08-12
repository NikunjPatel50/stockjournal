"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  LayoutDashboard,
  MessageSquare,
  Settings,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { MarketIndicesPanel } from "@/components/sidebar/market-indices-panel";
import { cn } from "@/lib/utils";

const navGroups = [
  {
    label: "Trading",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/calendar", label: "Calendar", icon: CalendarDays },
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/journal", label: "Journal", icon: BookOpen },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/settings", label: "Settings", icon: Settings },
      { href: "/feedback", label: "Feedback", icon: MessageSquare },
    ],
  },
] as const;

function isActiveRoute(pathname: string, href: string) {
  return (
    pathname === href ||
    (href !== "/dashboard" && pathname.startsWith(href))
  );
}

function NavContent() {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const navSpring = reduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 380, damping: 34, mass: 0.85 };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-sidebar-border px-4 py-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 rounded-lg outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <BrandLogo
            size="md"
            framedMark={false}
            showWordmark={false}
            logoTheme="auto"
            priority
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight text-sidebar-foreground">
              SwingTradingLog
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              Trading journal
            </p>
          </div>
        </Link>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
        <div className="rounded-xl border border-border/80 bg-card p-3 shadow-sm ring-1 ring-border/40">
          <div className="flex flex-col gap-5">
            {navGroups.map((group) => (
              <div key={group.label}>
                <p className="mb-2 px-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
                  {group.label}
                </p>
                <nav className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActiveRoute(pathname, item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "group relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors duration-200",
                          active
                            ? "text-foreground"
                            : "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-foreground"
                        )}
                      >
                        {active ? (
                          <motion.span
                            layoutId="sidebar-nav-active"
                            className="absolute inset-0 rounded-lg bg-background shadow-sm ring-1 ring-border/80"
                            transition={navSpring}
                          />
                        ) : null}
                        <span
                          className={cn(
                            "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-md transition-colors duration-200",
                            active
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground group-hover:bg-sidebar-accent group-hover:text-sidebar-foreground"
                          )}
                        >
                          <Icon className="size-4" strokeWidth={active ? 2.25 : 2} />
                        </span>
                        <span className="relative z-10 truncate">{item.label}</span>
                        {active ? (
                          <motion.span
                            layoutId="sidebar-nav-dot"
                            className="relative z-10 ml-auto size-1.5 shrink-0 rounded-full bg-primary"
                            transition={navSpring}
                            aria-hidden
                          />
                        ) : null}
                      </Link>
                    );
                  })}
                </nav>
              </div>
            ))}
          </div>
        </div>

        <MarketIndicesPanel />
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-full w-72 min-w-72 shrink-0 border-r border-sidebar-border bg-sidebar lg:flex lg:flex-col">
      <NavContent />
    </aside>
  );
}
