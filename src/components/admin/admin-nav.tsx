"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_NAV_ITEMS } from "@/lib/admin-nav-config";
import { cn } from "@/lib/utils";

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Admin sections"
      className="inline-flex h-10 items-center gap-0.5 rounded-lg border border-border bg-muted/60 p-1 dark:bg-muted/40"
    >
      {ADMIN_NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);

        return (
          <Link
            key={item.id}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-md border border-transparent px-2.5 text-xs font-medium transition-colors sm:px-3",
              active
                ? "border-primary/25 bg-primary/15 font-semibold text-primary dark:border-primary/30 dark:bg-primary/20"
                : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
            )}
          >
            <Icon className="size-3.5 shrink-0" />
            <span className="whitespace-nowrap">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
