import type { TradePulseAnomaly } from "@/lib/trade-pulse/anomaly-types";
import { tradePulseConfig } from "@/lib/trade-pulse/config";
import { callOpenRouterChat } from "@/lib/trade-pulse/openrouter";
import type { TradePulseNewsItem } from "@/lib/trade-pulse/news-types";
import type { TradePulsePosition } from "@/lib/trade-pulse/position-types";
import type { PositionMarketData } from "@/lib/trade-pulse/types";

const SYSTEM_PROMPT = `You are writing a short, neutral trade-pulse note for a swing trader's dashboard. Given the position details, today's price/volume data, and any recent news, write 1-2 sentences connecting the price/volume action to the news if related, or simply note the anomaly if no clear news exists. Never recommend an action (no 'sell', 'hold', 'buy more', 'exit'). Stay factual and neutral. End with a short phrase inviting the trader to review their own thesis, not a specific instruction.`;

function buildUserPrompt(input: {
  position: TradePulsePosition;
  marketData: PositionMarketData;
  news: TradePulseNewsItem[];
  anomaly?: TradePulseAnomaly | null;
}): string {
  return [
    "Write a Trade Pulse note from this structured context.",
    "",
    "Position:",
    JSON.stringify(
      {
        ticker: input.position.ticker,
        direction: input.position.direction,
        entryDate: input.position.entryDate,
        entryPrice: input.position.entryPrice,
        daysSinceEntry: input.marketData.daysSinceEntry,
      },
      null,
      2
    ),
    "",
    "Today market data:",
    JSON.stringify(
      {
        date: input.marketData.today.date,
        open: input.marketData.today.open,
        high: input.marketData.today.high,
        low: input.marketData.today.low,
        close: input.marketData.today.close,
        volume: input.marketData.today.volume,
        previousClose: input.marketData.previousClose,
        avgVolume20d: input.marketData.avgVolume20d,
        volumeRatio: Number(input.marketData.volumeRatio.toFixed(2)),
        atr14: Number(input.marketData.atr14.toFixed(2)),
        priceMovePct: Number(input.marketData.priceMovePct.toFixed(2)),
        priceMoveAtrMultiple: Number(
          input.marketData.priceMoveAtrMultiple.toFixed(2)
        ),
      },
      null,
      2
    ),
    "",
    "Anomaly flags:",
    JSON.stringify(
      input.anomaly ?? {
        hasVolumeAnomaly:
          input.marketData.volumeRatio >
          tradePulseConfig.anomalyThresholds.volumeRatio,
        hasPriceAnomaly:
          input.marketData.priceMoveAtrMultiple >
          tradePulseConfig.anomalyThresholds.priceMoveAtrMultiple,
        hasNews: input.news.length > 0,
      },
      null,
      2
    ),
    "",
    "Recent news:",
    JSON.stringify(
      input.news.map((item) => ({
        headline: item.headline,
        source: item.source,
        publishedAt: item.publishedAt,
        summary: item.summary,
      })),
      null,
      2
    ),
    "",
    "Return only the note text. No bullet points, labels, or markdown.",
  ].join("\n");
}

export async function generateTradePulseNote(
  position: TradePulsePosition,
  marketData: PositionMarketData,
  news: TradePulseNewsItem[],
  anomaly?: TradePulseAnomaly | null
): Promise<string> {
  const note = await callOpenRouterChat([
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: buildUserPrompt({ position, marketData, news, anomaly }),
    },
  ]);

  return note.replace(/^["']|["']$/g, "").trim();
}
