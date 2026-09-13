import { ScreenerHub } from "@/components/screener/screener-hub";
import { parseScreenerTab } from "@/lib/screener/tabs";

export default async function ScreenerPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  return <ScreenerHub initialTab={parseScreenerTab(tab)} />;
}
