"use client";

import Link from "next/link";
import { Shield } from "lucide-react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useIsAdmin } from "@/components/admin/admin-access-provider";
import { cn } from "@/lib/utils";

export function AdminPanelButton({ className }: { className?: string }) {
  const isAdmin = useIsAdmin();
  const pathname = usePathname();

  if (!isAdmin) return null;

  const active = pathname.startsWith("/admin");

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      nativeButton={false}
      render={<Link href="/admin" aria-label="Admin panel" />}
      className={cn(
        "size-9 shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground",
        active && "border border-primary/30 bg-primary/10 text-foreground",
        className
      )}
    >
      <Shield className="size-4" />
    </Button>
  );
}
