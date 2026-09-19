"use client";

import { useScreenerStream } from "@/hooks/use-screener-stream";
import type { SectorScreenerRow } from "@/lib/screener/types";

export type SectorsPayload = {
  sectors: SectorScreenerRow[];
  asOf: string;
  sessionDate?: string;
};

export function useScreenerSectors() {
  return useScreenerStream<SectorsPayload>("/api/screener/sectors");
}
