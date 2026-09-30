import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/admin";
import { screenerJson } from "@/lib/screener/http";
import {
  loadSectorStocks,
  readCachedSectorStocks,
  type SectorStocksPayload,
} from "@/lib/screener/load-screener";
import type { SectorStockRow } from "@/lib/screener/types";
import { getCurrentUser } from "@/lib/supabase/server";

export const maxDuration = 120;

export async function GET(
  request: Request,
  context: { params: Promise<{ sectorId: string }> }
) {
  const user = await getCurrentUser();
  if (!user || !isAdminUser(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { sectorId } = await context.params;
  const url = new URL(request.url);
  const fresh = url.searchParams.get("fresh") === "1";
  const stream = url.searchParams.get("stream") === "1";

  if (!fresh) {
    const cached = readCachedSectorStocks(sectorId);
    if (cached) return screenerJson(cached);
  }

  if (!stream) {
    const payload = await loadSectorStocks(sectorId, fresh);
    if (!payload) {
      return NextResponse.json({ error: "Sector not found" }, { status: 404 });
    }
    return screenerJson(payload);
  }

  const encoder = new TextEncoder();
  const body = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };

      try {
        const payload = await loadSectorStocks(sectorId, fresh, {
          onMeta: (meta: SectorStocksPayload) => {
            send({ type: "meta", data: meta });
          },
          onStock: (stock: SectorStockRow, loaded: number, total: number) => {
            send({ type: "stock", stock, loaded, total });
          },
        });
        if (!payload) {
          send({ type: "error", message: "Sector not found" });
          return;
        }
        send({ type: "complete", data: payload });
      } catch (error) {
        send({
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : "Could not load screener data.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-store",
    },
  });
}
