"use client";

import { useCallback, useState, type MouseEvent, type PointerEvent } from "react";
import { usePathname } from "next/navigation";

/**
 * Pathname that switches to the clicked link immediately, before the route
 * finishes loading, so nav highlights respond on click.
 */
export function useOptimisticPathname(override?: string) {
  const routerPathname = usePathname() ?? "";
  const pathname = override ?? routerPathname;
  const [pending, setPending] = useState<{ href: string; from: string } | null>(
    null
  );

  const activePathname =
    pending && pending.from === pathname ? pending.href : pathname;

  const onNavigate = useCallback(
    (href: string) =>
    (event: MouseEvent<HTMLAnchorElement> | PointerEvent<HTMLAnchorElement>) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      setPending({ href, from: pathname });
    },
    [pathname]
  );

  return { activePathname, onNavigate };
}
