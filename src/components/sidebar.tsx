"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  LayoutDashboard,
  Menu,
  MessageSquare,
  Settings,
  Target,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/journal", label: "Journal", icon: BookOpen },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/feedback", label: "Feedback", icon: MessageSquare },
] as const;

type SidebarUser = {
  email?: string | null;
  profile?: { name?: string | null } | null;
};

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-sidebar-border px-3 py-2.5">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="flex justify-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <BrandLogo
            lockup
            size="md"
            framedMark={false}
            showWordmark={false}
            logoTheme="auto"
            priority
            className="w-auto [&_picture]:!h-[5.5rem] [&_picture]:!w-auto [&_img]:!h-[5.5rem] [&_img]:!w-auto"
          />
        </Link>
      </div>

      <div className="flex flex-1 flex-col px-3 py-4 pb-6">
        <nav className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm font-medium transition-[background,box-shadow,transform,color] duration-200",
                  active
                    ? "nav-liquid-glass text-sidebar-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                )}
              >
                {active ? (
                  <>
                    <span className="nav-liquid-glass-sheen" aria-hidden />
                    <span className="nav-liquid-glass-glare" aria-hidden />
                    <span className="nav-liquid-glass-edge" aria-hidden />
                    <span className="nav-liquid-glass-accent" aria-hidden />
                  </>
                ) : null}
                <span
                  className={cn(
                    "relative z-[1] flex size-8 shrink-0 items-center justify-center rounded-lg border border-transparent transition-colors",
                    active
                      ? "nav-liquid-glass-icon text-primary"
                      : "bg-sidebar-accent/40 text-muted-foreground group-hover:bg-sidebar-accent group-hover:text-sidebar-foreground"
                  )}
                >
                  <Icon className="size-4" strokeWidth={2} />
                </span>
                <span className="relative z-[1] truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

export function Sidebar({ user: _user }: { user: SidebarUser }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <aside className="sticky top-0 hidden h-full w-[17.5rem] shrink-0 border-r border-sidebar-border bg-sidebar lg:flex lg:flex-col">
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
          className="w-[min(100vw-2rem,18rem)] border-sidebar-border bg-sidebar p-0"
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
