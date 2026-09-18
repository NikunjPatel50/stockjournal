import { AppPageHeader } from "@/components/app-page-header";
import { DataPanel, PanelEmpty } from "@/components/data-panel";
import { APP_PAGE_SHELL_CLASS } from "@/lib/app-shell";
import { cn } from "@/lib/utils";

export default function PaperTradingPage() {
  return (
    <div className={cn(APP_PAGE_SHELL_CLASS, "gap-5 sm:min-h-full")}>
      <div className="mb-5 shrink-0 border-b border-border pb-5 sm:mb-6 sm:pb-6">
        <AppPageHeader
          eyebrow="Private workspace"
          title="Paper Trading"
          description="Simulate entries and exits with virtual capital. This tab is only visible on your account."
        />
      </div>

      <DataPanel
        title="Open positions"
        subtitle="Practice trades without risking real capital."
        meta="0 positions"
      >
        <PanelEmpty
          title="No paper positions yet"
          hint="Your paper trading workspace is ready. Positions and P&L tracking will appear here once you start logging simulated trades."
        />
      </DataPanel>
    </div>
  );
}
