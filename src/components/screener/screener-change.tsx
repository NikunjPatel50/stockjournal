import { formatChangePercent, changeToneClass } from "@/lib/screener/format";
import { cn, NUMERIC_CLASS } from "@/lib/utils";

export function ScreenerChange({
  value,
  className,
}: {
  value: number | null | undefined;
  className?: string;
}) {
  return (
    <span className={cn(NUMERIC_CLASS, changeToneClass(value), className)}>
      {formatChangePercent(value)}
    </span>
  );
}
