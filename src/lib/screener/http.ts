import { NextResponse } from "next/server";

const CACHE_CONTROL = "private, max-age=120, stale-while-revalidate=1800";

export function screenerJson<T>(payload: T, init?: { status?: number }) {
  return NextResponse.json(payload, {
    status: init?.status ?? 200,
    headers: {
      "Cache-Control": CACHE_CONTROL,
    },
  });
}
