import { GoogleAnalytics } from "@/components/google-analytics";
import { MicrosoftClarity } from "@/components/microsoft-clarity";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground antialiased">
      <GoogleAnalytics />
      <MicrosoftClarity />
      {children}
    </div>
  );
}
