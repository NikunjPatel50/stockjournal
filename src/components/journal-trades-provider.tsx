"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { useJournalTradesState } from "@/lib/trades-storage";

type JournalTradesContextValue = ReturnType<typeof useJournalTradesState>;

const JournalTradesContext = createContext<JournalTradesContextValue | null>(
  null
);

/** Single shared trades store — avoids duplicate cloud sync per page mount. */
export function JournalTradesProvider({ children }: { children: ReactNode }) {
  const value = useJournalTradesState();
  return (
    <JournalTradesContext.Provider value={value}>
      {children}
    </JournalTradesContext.Provider>
  );
}

export function useJournalTrades(): JournalTradesContextValue {
  const context = useContext(JournalTradesContext);
  if (!context) {
    throw new Error(
      "useJournalTrades must be used within JournalTradesProvider"
    );
  }
  return context;
}
