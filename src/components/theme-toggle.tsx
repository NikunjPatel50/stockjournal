"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSettings } from "@/components/settings/settings-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const { updateSettings, hydrated } = useSettings();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted ? resolvedTheme !== "light" : true;

  function toggleTheme() {
    if (!mounted || !hydrated || resolvedTheme === undefined) return;
    const next = resolvedTheme === "light" ? "dark" : "light";
    setTheme(next);
    updateSettings((prev) => ({
      ...prev,
      display: { ...prev.display, theme: next },
    }));
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-lg"
      className={cn(
        "text-muted-foreground hover:bg-muted hover:text-foreground",
        className
      )}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggleTheme}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}
