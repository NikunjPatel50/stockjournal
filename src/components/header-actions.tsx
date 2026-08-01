import { AdminPanelButton } from "@/components/admin/admin-panel-button";
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
}: {
  className?: string;
  align?: "start" | "center" | "end";
  fullWidth?: boolean;
  profileClassName?: string;
  themeToggleClassName?: string;
  /** When false, only the theme toggle is shown (e.g. sidebar footer). */
  showProfile?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <AdminPanelButton
        className={cn(
          "border border-border bg-card hover:bg-muted",
          themeToggleClassName
        )}
      />
      <ThemeToggle
        className={cn(
          "shrink-0 border border-border bg-card hover:bg-muted",
          themeToggleClassName
        )}
      />
      {showProfile ? (
        <UserProfileBadge
          align={align}
          fullWidth={fullWidth}
          className={profileClassName}
        />
      ) : null}
    </div>
  );
}
