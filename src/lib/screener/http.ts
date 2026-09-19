import { NextResponse } from "next/server";

const CACHE_CONTROL = "private, max-age=120, stale-while-revalidate=1800";

export type ScreenerLoadProgress = {
  loaded: number;
  total: number;
};

export function screenerJson<T>(payload: T, init?: { status?: number }) {
  return NextResponse.json(payload, {
    status: init?.status ?? 200,
    headers: {
      "Cache-Control": CACHE_CONTROL,
    },
  });
}

export function screenerNdjsonStream<T>(
  run: (onProgress: (progress: ScreenerLoadProgress) => void) => Promise<T>
) {
  const encoder = new TextEncoder();
  const body = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };

      try {
        let lastProgressAt = 0;
        const payload = await run(({ loaded, total }) => {
          const now = Date.now();
          if (
            loaded !== 0 &&
            loaded !== total &&
            now - lastProgressAt < 200
          ) {
            return;
          }
          lastProgressAt = now;
          send({ type: "progress", loaded, total });
        });
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
