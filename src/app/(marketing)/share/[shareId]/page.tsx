import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  formatShareHoldDuration,
  formatSharePnl,
  formatShareReturn,
  parseShareTradeToken,
  tradeCardImagePath,
} from "@/lib/share-trade";
import { buildPageMetadata } from "@/lib/site";
import { cn, NUMERIC_CLASS } from "@/lib/utils";

type PageProps = {
  params: Promise<{ shareId: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { shareId } = await params;
  const trade = await parseShareTradeToken(decodeURIComponent(shareId));
  if (!trade) {
    return { title: "Trade not found" };
  }
  const title = `${trade.ticker} trade · ${formatShareReturn(trade)}`;
  return buildPageMetadata({
    title,
    description: `${trade.ticker} swing trade shared from SwingTradingLog.`,
    path: `/share/${encodeURIComponent(shareId)}`,
    openGraphTitle: title,
  });
}

export default async function ShareTradePage({ params }: PageProps) {
  const { shareId } = await params;
  const token = decodeURIComponent(shareId);
  const trade = await parseShareTradeToken(token);
  if (!trade) notFound();

  const imageUrl = tradeCardImagePath(token);
  const win = trade.outcome === "Win" || trade.pnl > 0;
  const loss = trade.outcome === "Loss" || trade.pnl < 0;

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-zinc-950 px-4 py-12 text-zinc-100">
      <div className="w-full max-w-3xl space-y-6 text-center">
        <p className="text-sm font-medium text-emerald-400">Shared trade</p>
        <h1 className="font-mono text-3xl font-semibold tracking-tight sm:text-4xl">
          {trade.ticker}
        </h1>
        {trade.strategy ? (
          <p className="text-muted-foreground">{trade.strategy}</p>
        ) : null}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={`${trade.ticker} trade card`}
          className="mx-auto w-full max-w-2xl rounded-xl border border-zinc-800 shadow-2xl"
        />
        <p
          className={cn(
            "text-2xl font-semibold",
            NUMERIC_CLASS,
            win
              ? "text-emerald-400"
              : loss
                ? "text-rose-400"
                : "text-zinc-300"
          )}
        >
          {formatShareReturn(trade)} · {formatSharePnl(trade.pnl)}
        </p>
        <p className="text-sm text-zinc-400">
          {formatShareHoldDuration(trade.holdTimeHours)} · {trade.direction}
        </p>
        <a
          href="/"
          className="inline-flex text-sm font-medium text-emerald-400 underline-offset-4 hover:underline"
        >
          Start your free swing trading journal on SwingTradingLog
        </a>
      </div>
    </div>
  );
}
