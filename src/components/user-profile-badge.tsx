"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ChevronDown, KeyRound, LogOut, Settings, Shield, UserRound } from "lucide-react";
import { signOutAction } from "@/app/actions/auth";
import { useIsAdmin } from "@/components/admin/admin-access-provider";
import { ChangePasswordDialog } from "@/components/settings/change-password-dialog";
import { useSettings } from "@/components/settings/settings-provider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function UserProfileBadge({
  className,
  align = "end",
  fullWidth = false,
}: {
  className?: string;
  align?: "start" | "center" | "end";
  fullWidth?: boolean;
}) {
  const { settings } = useSettings();
  const isAdmin = useIsAdmin();
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const displayName = settings.profile.fullName.trim() || "Your account";
  const displayHandle = settings.profile.handle.trim() || "Set up profile";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            "group inline-flex max-w-[min(100%,11rem)] items-center gap-2 rounded-lg border border-border bg-card px-2 py-1.5 text-left outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/50 sm:max-w-[200px]",
            fullWidth && "flex w-full max-w-none",
            className
          )}
        >
          <Avatar className="size-7 shrink-0">
            <AvatarFallback className="bg-emerald-500/15 text-[10px] font-semibold text-emerald-500">
              {settings.profile.initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium leading-tight text-foreground">
              {displayName}
            </p>
            <p className="truncate text-[11px] leading-tight text-muted-foreground">
              {displayHandle}
            </p>
          </div>
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground transition-transform group-data-popup-open:rotate-180" />
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align={align}
          sideOffset={8}
          className="w-64 min-w-56 p-1.5"
        >
          <div className="px-2 py-2">
            <div className="flex items-center gap-3">
              <Avatar className="size-9">
                <AvatarFallback className="bg-emerald-500/15 text-xs font-semibold text-emerald-500">
                  {settings.profile.initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {displayName}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {displayHandle}
                </p>
              </div>
            </div>
          </div>

          <DropdownMenuSeparator />

          {isAdmin ? (
            <DropdownMenuItem
              className="cursor-pointer gap-2 px-2 py-2"
              render={<Link href="/admin" />}
            >
              <Shield className="size-4" />
              Admin panel
            </DropdownMenuItem>
          ) : null}

          <DropdownMenuItem
            className="cursor-pointer gap-2 px-2 py-2"
            render={<Link href="/settings" />}
          >
            <UserRound className="size-4" />
            Profile & account
          </DropdownMenuItem>

          <DropdownMenuItem
            className="cursor-pointer gap-2 px-2 py-2"
            onClick={() => setPasswordOpen(true)}
          >
            <KeyRound className="size-4" />
            Change password
          </DropdownMenuItem>

          <DropdownMenuItem
            className="cursor-pointer gap-2 px-2 py-2"
            render={<Link href="/settings?tab=display" />}
          >
            <Settings className="size-4" />
            Preferences
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            variant="destructive"
            className="cursor-pointer gap-2 px-2 py-2"
            disabled={pending}
            onClick={() => startTransition(() => signOutAction())}
          >
            <LogOut className="size-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ChangePasswordDialog
        open={passwordOpen}
        onOpenChange={setPasswordOpen}
      />
    </>
  );
}
