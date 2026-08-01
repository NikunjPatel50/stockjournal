"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowDownUp,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { adminNavItemsInOrder } from "@/lib/admin-nav-config";
import {
  DEFAULT_ADMIN_NAV_ORDER,
  loadAdminNavOrder,
  moveAdminNavTab,
  saveAdminNavOrder,
  type AdminNavTabId,
} from "@/lib/admin-nav-prefs";
import { cn } from "@/lib/utils";

export function AdminNav() {
  const pathname = usePathname();
  const [order, setOrder] = useState<AdminNavTabId[]>(DEFAULT_ADMIN_NAV_ORDER);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setOrder(loadAdminNavOrder());
    setHydrated(true);
  }, []);

  function applyOrder(next: AdminNavTabId[]) {
    setOrder(next);
    saveAdminNavOrder(next);
  }

  function move(tabId: AdminNavTabId, direction: "up" | "down") {
    applyOrder(moveAdminNavTab(order, tabId, direction));
  }

  function resetOrder() {
    applyOrder([...DEFAULT_ADMIN_NAV_ORDER]);
  }

  const items = adminNavItemsInOrder(order);

  return (
    <div className="mb-6 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <Shield className="size-3.5" />
          Admin panel
        </div>

        <Popover>
          <PopoverTrigger
            render={
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
              />
            }
          >
            <ArrowDownUp className="size-3.5" />
            Reorder tabs
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="end">
            <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
              <p className="text-sm font-medium">Tab order</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2 text-xs text-muted-foreground"
                onClick={resetOrder}
              >
                <RotateCcw className="size-3" />
                Reset
              </Button>
            </div>
            <ul className="p-2">
              {items.map((item, index) => {
                const Icon = item.icon;
                return (
                  <li
                    key={item.id}
                    className="flex items-center gap-2 rounded-md px-1 py-1.5 hover:bg-muted/50"
                  >
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted/50 text-muted-foreground">
                      <Icon className="size-3.5" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {item.label}
                    </span>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="size-7"
                        disabled={index === 0}
                        aria-label={`Move ${item.label} up`}
                        onClick={() => move(item.id, "up")}
                      >
                        <ChevronUp className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="size-7"
                        disabled={index === items.length - 1}
                        aria-label={`Move ${item.label} down`}
                        onClick={() => move(item.id, "down")}
                      >
                        <ChevronDown className="size-3.5" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
              Use the arrows to reorder admin tabs. Your layout is saved on this
              device.
            </p>
          </PopoverContent>
        </Popover>
      </div>

      <nav
        className={cn(
          "flex flex-wrap gap-2",
          !hydrated && "opacity-0"
        )}
        aria-busy={!hydrated}
      >
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "border-primary/30 bg-primary/10 text-foreground"
                  : "border-border/70 bg-card text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
