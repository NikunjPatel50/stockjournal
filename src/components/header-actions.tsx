import { AdminPanelButton } from "@/components/admin/admin-panel-button";
import { JournalMarketSelector } from "@/components/journal/journal-market-selector";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserProfileBadge } from "@/components/user-profile-badge";
import { cn } from "@/lib/utils";

const HEADER_CONTROL_HEIGHT_CLASS = "h-9";
const HEADER_CONTROL_SQUARE_CLASS = "size-9";
const HEADER_CONTROL_HEIGHT_COMPACT_CLASS = "h-8";
const HEADER_CONTROL_SQUARE_COMPACT_CLASS = "size-8";

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
  const controlHeight = compact
    ? HEADER_CONTROL_HEIGHT_COMPACT_CLASS
    : HEADER_CONTROL_HEIGHT_CLASS;
  const controlSquare = compact
    ? HEADER_CONTROL_SQUARE_COMPACT_CLASS
    : HEADER_CONTROL_SQUARE_CLASS;

  return (
    <div
      className={cn(
        "flex min-w-0 items-center justify-end",
        compact ? "flex-nowrap gap-1" : "flex-wrap gap-2",
        className
      )}
    >
      <JournalMarketSelector
        compact={compact}
        className={cn(controlHeight, compact && controlSquare)}
      />
      <AdminPanelButton
        className={cn(
          "border border-border bg-card hover:bg-muted",
          controlSquare,
          themeToggleClassName
        )}
      />
      <ThemeToggle
        className={cn(
          "shrink-0 border border-border bg-card hover:bg-muted",
          controlSquare,
          themeToggleClassName
        )}
      />
      {showProfile ? (
        <UserProfileBadge
          align={align}
          fullWidth={fullWidth}
          compact={compact}
          className={cn(controlHeight, profileClassName)}
        />
      ) : null}
    </div>
  );
}
