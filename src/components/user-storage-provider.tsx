"use client";

import { useEffect, useLayoutEffect, type ReactNode } from "react";
import { useSettings } from "@/components/settings/settings-provider";
import { USER_STORAGE_BOUND_EVENT } from "@/lib/trades-storage";
import { initialsFromName, loadSettings } from "@/lib/settings";
import { setActiveStorageUserId } from "@/lib/user-storage";

export function UserStorageProvider({
  userId,
  userDisplayName,
  children,
}: {
  userId: string;
  userDisplayName?: string | null;
  children: ReactNode;
}) {
  const { replaceSettings, hydrated } = useSettings();

  useLayoutEffect(() => {
    setActiveStorageUserId(userId);
  }, [userId]);

  useEffect(() => {
    window.dispatchEvent(new Event(USER_STORAGE_BOUND_EVENT));

    if (!hydrated) return;

    let next = loadSettings(userId);
    const name = userDisplayName?.trim();
    if (name && !next.profile.fullName.trim()) {
      next = {
        ...next,
        profile: {
          ...next.profile,
          fullName: name,
          initials: initialsFromName(name),
        },
      };
    }
    replaceSettings(next);

    return () => {
      setActiveStorageUserId(null);
      window.dispatchEvent(new Event(USER_STORAGE_BOUND_EVENT));
    };
  }, [userId, userDisplayName, hydrated, replaceSettings]);

  return children;
}
