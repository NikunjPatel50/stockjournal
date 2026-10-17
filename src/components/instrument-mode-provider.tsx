"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { useIsAdmin } from "@/components/admin/admin-access-provider";
import {
  detectInstrumentMode,
  instrumentHref,
  switchInstrumentPath,
  tabForPathname,
  type InstrumentMode,
} from "@/lib/instrument-mode";

const STORAGE_KEY = "instrument-mode";

type InstrumentModeContextValue = {
  mode: InstrumentMode;
  hrefFor: (href: string) => string;
  selectMode: (mode: InstrumentMode) => void;
  /** Warm the page the switch would open, so the swap needs no server wait. */
  prefetchMode: (mode: InstrumentMode) => void;
};

const InstrumentModeContext = createContext<InstrumentModeContextValue | null>(
  null
);

function readStoredMode(): InstrumentMode {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === "options" ? "options" : "stocks";
  } catch {
    return "stocks";
  }
}

const subscribeToNothing = () => () => {};

export function InstrumentModeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const detected = detectInstrumentMode(pathname);
  const storedMode = useSyncExternalStore<InstrumentMode>(
    subscribeToNothing,
    readStoredMode,
    () => "stocks"
  );
  const [visited, setVisited] = useState<InstrumentMode | null>(null);
  const [override, setOverride] = useState<InstrumentMode | null>(null);
  const [lastPath, setLastPath] = useState({
    stocks: "/dashboard",
    options: "/options/dashboard",
  });
  const [seenPath, setSeenPath] = useState<string | null>(null);

  if (seenPath !== pathname) {
    setSeenPath(pathname);
    if (detected) {
      setVisited(detected);
      setOverride((current) => (current === detected ? null : current));
      const route = tabForPathname(pathname);
      if (route) {
        const href = detected === "options" ? route.options : route.stocks;
        setLastPath((prev) =>
          prev[detected] === href ? prev : { ...prev, [detected]: href }
        );
      }
    }
  }

  useEffect(() => {
    if (!detected) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, detected);
    } catch {
      // Private browsing can block storage; the URL still carries the mode.
    }
  }, [detected]);

  const isAdmin = useIsAdmin();
  const mode = isAdmin ? (override ?? detected ?? visited ?? storedMode) : "stocks";
  const other: InstrumentMode = mode === "options" ? "stocks" : "options";
  const otherHref = switchInstrumentPath(pathname, other, lastPath[other]);

  useEffect(() => {
    if (!isAdmin) return;
    router.prefetch(otherHref);
  }, [isAdmin, otherHref, router]);

  const value = useMemo<InstrumentModeContextValue>(
    () => ({
      mode,
      hrefFor: (href) => instrumentHref(href, mode),
      selectMode: (next) => {
        if (next === mode) return;
        const href = switchInstrumentPath(pathname, next, lastPath[next]);
        setOverride(next);
        router.push(href);
      },
      prefetchMode: (next) => {
        if (next === mode) return;
        router.prefetch(switchInstrumentPath(pathname, next, lastPath[next]));
      },
    }),
    [mode, pathname, lastPath, router]
  );

  return (
    <InstrumentModeContext.Provider value={value}>
      {children}
    </InstrumentModeContext.Provider>
  );
}

export function useInstrumentMode() {
  const value = useContext(InstrumentModeContext);
  if (!value) {
    throw new Error("useInstrumentMode must be used within InstrumentModeProvider");
  }
  return value;
}
