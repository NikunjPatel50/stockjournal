"use client";

import Link from "next/link";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  LayoutDashboard,
  MessageSquare,
  MoreHorizontal,
  ScanSearch,
  Settings,
  Target,
} from "lucide-react";
import { useIsAdmin } from "@/components/admin/admin-access-provider";
import { useInstrumentMode } from "@/components/instrument-mode-provider";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useOptimisticPathname } from "@/hooks/use-optimistic-pathname";
import { STOCKS_ONLY_HREFS } from "@/lib/instrument-mode";
import { cn } from "@/lib/utils";

const primaryTabs = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/journal", label: "Journal", icon: BookOpen },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

const moreLinks = [
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/screener", label: "Screener", icon: ScanSearch, adminOnly: true },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/feedback", label: "Feedback", icon: MessageSquare },
] as const;

function isActiveRoute(pathname: string, href: string) {
  if (pathname === href) return true;
  const dashboardRoot = href === "/dashboard" || href === "/options/dashboard";
  if (dashboardRoot) return false;
  return pathname.startsWith(`${href}/`);
}

export function MobileBottomNav() {
  const { activePathname: pathname, onNavigate } = useOptimisticPathname();
  const { hrefFor, mode } = useInstrumentMode();
  const isAdmin = useIsAdmin();
  const visibleMoreLinks = moreLinks.filter(
    (link) =>
      (!("adminOnly" in link && link.adminOnly) || isAdmin) &&
      !(mode === "options" && STOCKS_ONLY_HREFS.has(link.href))
  );
  const moreActive = visibleMoreLinks.some((link) =>
    isActiveRoute(pathname ?? "", hrefFor(link.href))
  );

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="Main navigation"
    >
      <div className="flex h-16 items-stretch">
        {primaryTabs.map((tab) => {
          const Icon = tab.icon;
          const href = hrefFor(tab.href);
          const active = isActiveRoute(pathname ?? "", href);
          return (
            <Link
              key={tab.href}
              href={href}
              onClick={onNavigate(href)}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="size-5" strokeWidth={active ? 2.25 : 2} />
              <span>{tab.label}</span>
            </Link>
          );
        })}

        <Sheet>
          <SheetTrigger
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors",
              moreActive ? "text-primary" : "text-muted-foreground"
            )}
            aria-label="More navigation"
          >
            <MoreHorizontal className="size-5" strokeWidth={moreActive ? 2.25 : 2} />
            <span>More</span>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
            <SheetHeader className="text-left">
              <SheetTitle>More</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-2 gap-2 px-4 pb-2">
              {visibleMoreLinks.map((link) => {
                const Icon = link.icon;
                const href = hrefFor(link.href);
                const active = isActiveRoute(pathname ?? "", href);
                return (
                  <Link
                    key={link.href}
                    href={href}
                    onClick={onNavigate(href)}
                    className={cn(
                      "flex min-h-14 items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-border/70 bg-muted/20 text-foreground hover:bg-muted/40"
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    <span
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-lg",
                        active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                      )}
                    >
                      <Icon className="size-4" strokeWidth={active ? 2.25 : 2} />
                    </span>
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
