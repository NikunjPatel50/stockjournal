"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  LayoutDashboard,
  Menu,
  MessageSquare,
  Settings,
  Target,
} from "lucide-react";
import { AdminPanelButton } from "@/components/admin/admin-panel-button";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserProfileBadge } from "@/components/user-profile-badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const navGroups = [
  {
    label: "Trading",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/journal", label: "Journal", icon: BookOpen },
      { href: "/goals", label: "Goals", icon: Target },
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

type SidebarUser = {
  email?: string | null;
  profile?: { name?: string | null } | null;
};

function isActiveRoute(pathname: string, href: string) {
  return (
    pathname === href ||
    (href !== "/dashboard" && pathname.startsWith(href))
  );
}

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-sidebar-border px-4 py-4">
        <Link
          href="/dashboard"
          onClick={onNavigate}
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

      <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-5">
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
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-card text-foreground shadow-sm ring-1 ring-border/80"
                        : "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-foreground"
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-md transition-colors",
                        active
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground group-hover:bg-sidebar-accent group-hover:text-sidebar-foreground"
                      )}
                    >
                      <Icon className="size-4" strokeWidth={active ? 2.25 : 2} />
                    </span>
                    <span className="truncate">{item.label}</span>
                    {active ? (
                      <span
                        className="ml-auto size-1.5 shrink-0 rounded-full bg-primary"
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

      <div className="mt-auto space-y-2.5 border-t border-sidebar-border px-3 py-3">
        <UserProfileBadge fullWidth align="start" className="w-full" />
        <div className="flex items-center gap-2">
          <AdminPanelButton className="border border-border bg-card hover:bg-muted" />
          <ThemeToggle className="border border-border bg-card hover:bg-muted" />
        </div>
      </div>
    </div>
  );
}

export function Sidebar({ user: _user }: { user: SidebarUser }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <aside className="sticky top-0 hidden h-full w-60 min-w-60 shrink-0 border-r border-sidebar-border bg-sidebar lg:flex lg:flex-col">
        <NavContent />
      </aside>

      <div className="fixed top-[max(0.75rem,env(safe-area-inset-top))] left-[max(0.75rem,env(safe-area-inset-left))] z-40 lg:hidden">
        <Button
          variant="outline"
          size="icon"
          className="border-border bg-card shadow-sm"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation"
        >
          <Menu className="size-4" />
        </Button>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="w-[min(100vw-2rem,17rem)] border-sidebar-border bg-sidebar p-0"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <NavContent onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
