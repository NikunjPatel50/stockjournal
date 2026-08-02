import { cn } from "@/lib/utils";

/** Dot colors keep categories scannable without tinting whole rows. */
export function feedbackCategoryDot(category: string): string {
  switch (category) {
    case "Bug report":
      return "bg-rose-500";
    case "Feature request":
      return "bg-violet-500";
    case "General":
      return "bg-sky-500";
    default:
      return "bg-muted-foreground/50";
  }
}

export function FeedbackCategoryBadge({
  category,
  className,
}: {
  category: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-border/70 bg-muted/30 px-2 py-0.5 text-[11px] font-medium text-foreground",
        className
      )}
    >
      <span
        className={cn("size-1.5 shrink-0 rounded-full", feedbackCategoryDot(category))}
        aria-hidden
      />
      {category}
    </span>
  );
}
