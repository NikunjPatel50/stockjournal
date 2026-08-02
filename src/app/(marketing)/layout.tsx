import { SiteJsonLd } from "@/components/seo/site-json-ld";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background pb-24 text-foreground antialiased sm:pb-28">
      <SiteJsonLd />
      {children}
    </div>
  );
}
