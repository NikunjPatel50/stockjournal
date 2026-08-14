import { AdminPanelButton } from "@/components/admin/admin-panel-button";
import { JournalMarketSelector } from "@/components/journal/journal-market-selector";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserProfileBadge } from "@/components/user-profile-badge";
import { cn } from "@/lib/utils";

export function HeaderActions({
  className,
  align = "end",
  fullWidth = false,
  profileClassName,
  themeToggleClassName,
  showProfile = true,
  compact = false,
}: {
  className?: string;
  align?: "start" | "center" | "end";
  fullWidth?: boolean;
  profileClassName?: string;
  themeToggleClassName?: string;
  /** When false, only the theme toggle is shown (e.g. sidebar footer). */
  showProfile?: boolean;
  /** Icon-only controls for narrow mobile headers. */
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center justify-end",
        compact ? "flex-nowrap gap-1" : "flex-wrap gap-2",
        className
      )}
    >
      <JournalMarketSelector compact={compact} />
      <AdminPanelButton
        className={cn(
          "border border-border bg-card hover:bg-muted",
          compact && "size-8",
          themeToggleClassName
        )}
      />
      <ThemeToggle
        className={cn(
          "shrink-0 border border-border bg-card hover:bg-muted",
          compact && "size-8",
          themeToggleClassName
        )}
      />
      {showProfile ? (
        <UserProfileBadge
          align={align}
          fullWidth={fullWidth}
          compact={compact}
          className={profileClassName}
        />
      ) : null}
    </div>
  );
}
