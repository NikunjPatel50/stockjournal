import type { JournalDirection } from "@/lib/journal-types";

export type TradePulsePosition = {
  ticker: string;
  direction: JournalDirection;
  entryDate: string;
  entryPrice: number;
};
