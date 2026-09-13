import { ScreenerStockDetailPage } from "@/components/screener/screener-stock-detail-page";
import { parseScreenerTab } from "@/lib/screener/tabs";

export default async function ScreenerStockPage({
  params,
  searchParams,
}: {
  params: Promise<{ ticker: string }>;
  searchParams: Promise<{ sectorId?: string; from?: string }>;
}) {
  const [{ ticker }, { sectorId, from }] = await Promise.all([
    params,
    searchParams,
  ]);
  return (
    <ScreenerStockDetailPage
      ticker={decodeURIComponent(ticker)}
      sectorId={sectorId}
      from={from ? parseScreenerTab(from) : undefined}
    />
  );
}
