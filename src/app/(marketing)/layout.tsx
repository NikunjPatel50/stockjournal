import { GoogleAnalytics } from "@/components/google-analytics";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground antialiased">
      <GoogleAnalytics />
      {children}
    </div>
  );
}
