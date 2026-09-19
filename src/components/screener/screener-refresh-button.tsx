"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ScreenerRefreshButton({
  loading,
  progress,
  onRefresh,
  className,
}: {
  loading: boolean;
  progress: number | null;
  onRefresh: () => void;
  className?: string;
}) {
  const showProgress = loading && progress != null;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onRefresh}
      disabled={loading}
      className={cn("relative h-9 min-w-[6.5rem] overflow-hidden", className)}
    >
      {showProgress ? (
        <span
          className="absolute inset-y-0 left-0 bg-primary/15 transition-[width] duration-300 ease-out"
          style={{ width: `${progress}%` }}
          aria-hidden
        />
      ) : null}
      <span className="relative z-10 inline-flex items-center gap-1.5">
        <RefreshCw className={loading ? "animate-spin" : undefined} />
        {showProgress ? `${progress}%` : "Refresh"}
      </span>
    </Button>
  );
}
