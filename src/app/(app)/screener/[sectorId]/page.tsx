import { notFound } from "next/navigation";
import { ScreenerSectorStocksPage } from "@/components/screener/screener-sector-stocks-page";
import { getIndianSector } from "@/lib/screener/indian-sectors";

export default async function ScreenerSectorPage({
  params,
}: {
  params: Promise<{ sectorId: string }>;
}) {
  const { sectorId } = await params;
  const sector = getIndianSector(sectorId);
  if (!sector || sector.isBenchmark) notFound();
  return <ScreenerSectorStocksPage sectorId={sectorId} />;
}
