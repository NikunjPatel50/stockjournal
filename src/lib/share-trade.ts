import type { JournalDirection, JournalOutcome } from "@/lib/journal-types";

export type ShareableTradePayload = {
  v: 1;
  ticker: string;
  direction: JournalDirection;
  entryPrice: number;
  exitPrice: number;
  roi: number;
  pnl: number;
  holdTimeHours: number;
  outcome: JournalOutcome;
  strategy: string;
  plannedRisk: number;
};

export function tradeToSharePayload(trade: {
  ticker: string;
  direction: JournalDirection;
  entryPrice: number;
  exitPrice: number;
  roi: number;
  pnl: number;
  holdTimeHours: number;
  outcome: JournalOutcome;
  strategy: string;
  plannedRisk: number;
}): ShareableTradePayload {
  return {
    v: 1,
    ticker: trade.ticker,
    direction: trade.direction,
    entryPrice: trade.entryPrice,
    exitPrice: trade.exitPrice,
    roi: trade.roi,
    pnl: trade.pnl,
    holdTimeHours: trade.holdTimeHours,
    outcome: trade.outcome,
    strategy: trade.strategy,
    plannedRisk: trade.plannedRisk,
  };
}

export function formatShareHoldDuration(hours: number): string {
  if (hours < 24) {
    const rounded = Math.max(1, Math.round(hours));
    return `Held ${rounded} hour${rounded === 1 ? "" : "s"}`;
  }
  const days = Math.max(1, Math.round(hours / 24));
  return `Held ${days} day${days === 1 ? "" : "s"}`;
}

/** R-multiple aligned with journal P&L vs planned risk (when planned risk exists). */
export function computeShareRMultiple(payload: ShareableTradePayload): number | null {
  if (!payload.plannedRisk || payload.plannedRisk <= 0) return null;
  return Math.round((payload.pnl / payload.plannedRisk) * 100) / 100;
}

export function formatShareReturn(payload: ShareableTradePayload): string {
  const r = computeShareRMultiple(payload);
  if (r !== null) {
    const sign = r > 0 ? "+" : "";
    return `${sign}${r}R`;
  }
  const sign = payload.roi > 0 ? "+" : "";
  return `${sign}${payload.roi.toFixed(2)}%`;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function textEncoder() {
  return new TextEncoder();
}

function textDecoder() {
  return new TextDecoder();
}

async function hmacSign(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    textEncoder().encode(message)
  );
  return base64UrlEncode(new Uint8Array(sig));
}

async function hmacVerify(
  message: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const expected = await hmacSign(message, secret);
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}

export function getShareTradeSecret(): string {
  return (
    process.env.SHARE_TRADE_SECRET ||
    process.env.INSFORGE_ANON_KEY ||
    "dev-only-share-trade-secret"
  );
}

export async function createShareTradeToken(
  payload: ShareableTradePayload
): Promise<string> {
  const body = base64UrlEncode(textEncoder().encode(JSON.stringify(payload)));
  const sig = await hmacSign(body, getShareTradeSecret());
  return `${body}.${sig}`;
}

export async function parseShareTradeToken(
  token: string
): Promise<ShareableTradePayload | null> {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const ok = await hmacVerify(body, sig, getShareTradeSecret());
  if (!ok) return null;
  try {
    const json = textDecoder().decode(base64UrlDecode(body));
    const parsed = JSON.parse(json) as ShareableTradePayload;
    if (parsed.v !== 1 || !parsed.ticker) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function sharePagePath(token: string): string {
  return `/share/${encodeURIComponent(token)}`;
}

export function tradeCardImagePath(token: string): string {
  return `/api/trade-card/${encodeURIComponent(token)}`;
}

export function formatSharePnl(pnl: number): string {
  const prefix = pnl >= 0 ? "+" : "-";
  return `${prefix}$${Math.abs(pnl).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
