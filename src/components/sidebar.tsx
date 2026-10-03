"use client";

import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  LayoutDashboard,
  MessageSquare,
  ScanSearch,
  Settings,
} from "lucide-react";
import { useIsAdmin } from "@/components/admin/admin-access-provider";
import { BrandLogo } from "@/components/brand-logo";
import { MarketIndicesPanel } from "@/components/sidebar/market-indices-panel";
import { useOptimisticPathname } from "@/hooks/use-optimistic-pathname";
import { cn } from "@/lib/utils";

const tradingNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/screener", label: "Screener", icon: ScanSearch, adminOnly: true },
  { href: "/journal", label: "Journal", icon: BookOpen },
] as const;

const accountNav = [
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/feedback", label: "Feedback", icon: MessageSquare },
] as const;

const SIDEBAR_INSET_SHELL =
  "rounded-xl border border-border bg-card/60 shadow-sm ring-1 ring-border/50 dark:bg-card/35 dark:ring-border/70";

function isActiveRoute(pathname: string, href: string) {
  return (
    pathname === href ||
    (href !== "/dashboard" && pathname.startsWith(href))
  );
}

function SidebarSectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="px-2 pb-1.5 pt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
      {children}
    </p>
  );
}

function NavContent({ pathnameOverride }: { pathnameOverride?: string }) {
  const { activePathname: pathname, onNavigate } =
    useOptimisticPathname(pathnameOverride);
  const isAdmin = useIsAdmin();
  const listRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState<{
    top: number;
    height: number;
  } | null>(null);
  const [animateIndicator, setAnimateIndicator] = useState(false);

  const placeIndicator = useCallback((target: HTMLElement) => {
    const list = listRef.current;
    if (!list) return;
    setIndicator({
      top: target.offsetTop,
      height: target.offsetHeight,
    });
  }, []);

  useLayoutEffect(() => {
    const active = listRef.current?.querySelector<HTMLElement>(
      '[aria-current="page"]'
    );
    if (!active) return;
    placeIndicator(active);
    const frame = requestAnimationFrame(() => setAnimateIndicator(true));
    return () => cancelAnimationFrame(frame);
  }, [pathname, placeIndicator, isAdmin]);

  const navGroups = [
    {
      label: "Trading",
      items: tradingNav.filter(
        (item) => !("adminOnly" in item && item.adminOnly) || isAdmin
      ),
    },
    { label: "Account", items: accountNav },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col bg-sidebar">
      <div className="shrink-0 px-4 pb-3 pt-5">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 rounded-xl outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <BrandLogo
            size="md"
            framedMark={false}
            showWordmark={false}
            logoTheme="auto"
            priority
          />
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold tracking-tight text-foreground">
              SwingTradingLog
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              Trading journal
            </p>
          </div>
        </Link>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 pb-3">
        <div className={cn(SIDEBAR_INSET_SHELL, "shrink-0 p-2")}>
          <div ref={listRef} className="relative flex flex-col gap-4">
            {indicator ? (
              <span
                aria-hidden
                className={cn(
                  "pointer-events-none absolute inset-x-0 rounded-lg bg-background shadow-sm ring-1 ring-border/80 will-change-transform dark:bg-background/90",
                  animateIndicator &&
                    "transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
                )}
                style={{
                  height: indicator.height,
                  transform: `translate3d(0, ${indicator.top}px, 0)`,
                }}
              />
            ) : null}
            {navGroups.map((group) => (
              <section key={group.label}>
                <SidebarSectionLabel>{group.label}</SidebarSectionLabel>
                <nav className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActiveRoute(pathname, item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onPointerDown={(event) => {
                          onNavigate(item.href)(event);
                          if (event.button === 0) placeIndicator(event.currentTarget);
                        }}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors duration-300 ease-out",
                          active
                            ? "text-foreground"
                            : "text-muted-foreground hover:bg-background/55 hover:text-foreground"
                        )}
                      >
                        <span
                          className={cn(
                            "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-md border border-transparent transition-colors duration-300 ease-out",
                            active
                              ? "border-border/60 bg-primary/10 text-primary"
                              : "bg-muted/30 text-muted-foreground group-hover:bg-muted/45 group-hover:text-foreground"
                          )}
                        >
                          <Icon
                            className="size-4"
                            strokeWidth={active ? 2.25 : 2}
                          />
                        </span>
                        <span className="relative z-10 min-w-0 truncate">
                          {item.label}
                        </span>
                      </Link>
                    );
                  })}
                </nav>
              </section>
            ))}
          </div>
        </div>

        <MarketIndicesPanel
          className={cn(SIDEBAR_INSET_SHELL, "shrink-0")}
          scrollable
        />
      </div>
    </div>
  );
}

export function Sidebar({ pathnameOverride }: { pathnameOverride?: string }) {
  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-full w-72 min-w-72 shrink-0 lg:flex lg:flex-col",
        "border-r border-border bg-sidebar"
      )}
    >
      <NavContent pathnameOverride={pathnameOverride} />
    </aside>
  );
}
