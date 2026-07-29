import { HeaderActions } from "@/components/header-actions";
import { cn } from "@/lib/utils";

type AppPageHeaderProps = {
  eyebrow?: string;
  /** When true (default), eyebrow uses small caps overline style. */
  overlineEyebrow?: boolean;
  title: string;
  description?: string;
  className?: string;
  actionsClassName?: string;
};

/** Consistent app shell header with mobile nav offset (hamburger). */
export function AppPageHeader({
  eyebrow,
  overlineEyebrow = true,
  title,
  description,
  className,
  actionsClassName,
}: AppPageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4",
        className
      )}
    >
      <div className="min-w-0 pl-12 pr-1 max-lg:pt-1 lg:pl-0 lg:pr-0">
        {eyebrow ? (
          <p
            className={cn(
              "text-xs font-medium text-muted-foreground",
              overlineEyebrow && "uppercase tracking-wider"
            )}
          >
            {eyebrow}
          </p>
        ) : null}
        <h1
          className={cn(
            "font-semibold tracking-tight text-foreground",
            eyebrow ? "mt-1 text-xl sm:text-2xl" : "text-2xl"
          )}
        >
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      <HeaderActions
        className={cn(
          "w-full max-w-full shrink-0 justify-end self-stretch pl-12 sm:w-auto sm:self-auto sm:pl-0",
          actionsClassName
        )}
      />
    </div>
  );
}
