import { ImageResponse } from "next/og";
import {
  formatShareHoldDuration,
  formatSharePnl,
  formatShareReturn,
  parseShareTradeToken,
} from "@/lib/share-trade";
import { getSiteUrl } from "@/lib/site";

export const runtime = "edge";

export async function GET(
  _request: Request,
  context: { params: Promise<{ shareId: string }> }
) {
  const { shareId } = await context.params;
  const token = decodeURIComponent(shareId);
  const trade = await parseShareTradeToken(token);

  if (!trade) {
    return new Response("Not found", { status: 404 });
  }

  const win = trade.outcome === "Win" || trade.pnl > 0;
  const loss = trade.outcome === "Loss" || trade.pnl < 0;
  const accent = win ? "#34d399" : loss ? "#f43f5e" : "#94a3b8";
  const logoUrl = `${getSiteUrl()}/swingtradinglog-logo-dark.png`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 48,
          background: "linear-gradient(145deg, #09090b 0%, #0f172a 55%, #052e16 100%)",
          color: "#f4f4f5",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div style={{ fontSize: 56, fontWeight: 700, letterSpacing: -1 }}>
              {trade.ticker}
            </div>
            {trade.strategy ? (
              <div style={{ fontSize: 22, color: "#a1a1aa" }}>{trade.strategy}</div>
            ) : null}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 20,
              color: "#34d399",
              fontWeight: 600,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt="" width={40} height={40} />
            SwingTradingLog
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 28, color: "#d4d4d8" }}>
            ${trade.entryPrice.toFixed(2)} → ${trade.exitPrice.toFixed(2)}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
            <div
              style={{
                fontSize: 64,
                fontWeight: 700,
                color: accent,
              }}
            >
              {formatShareReturn(trade)}
            </div>
            <div style={{ fontSize: 32, color: accent }}>{formatSharePnl(trade.pnl)}</div>
          </div>
          <div style={{ fontSize: 24, color: "#a1a1aa" }}>
            {formatShareHoldDuration(trade.holdTimeHours)} · {trade.direction}
          </div>
        </div>

        <div
          style={{
            fontSize: 18,
            color: "#71717a",
            borderTop: "1px solid #27272a",
            paddingTop: 20,
          }}
        >
          swingtradinglog.com — free swing trading journal
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
