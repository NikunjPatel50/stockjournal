"use client";

import Link from "next/link";
import { Shield } from "lucide-react";
import { usePathname } from "next/navigation";
import { useIsAdmin } from "@/components/admin/admin-access-provider";
import { cn } from "@/lib/utils";

export function AdminPanelButton({ className }: { className?: string }) {
  const isAdmin = useIsAdmin();
  const pathname = usePathname();

  if (!isAdmin) return null;

  const active = pathname.startsWith("/admin");

  return (
    <Link
      href="/admin"
      aria-label="Admin panel"
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        active && "border-primary/30 bg-primary/10 text-foreground",
        className
      )}
    >
      <Shield className="size-4" />
    </Link>
  );
}
