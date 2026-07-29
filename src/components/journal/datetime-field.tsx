"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function parseDateTimeFieldValue(value: string): Date {
  if (!value) return new Date();
  const [datePart, timePart] = value.split("T");
  if (!datePart || !timePart) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0, 0);
}

export function formatDateTimeFieldValue(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function to12Hour(date: Date) {
  const hours24 = date.getHours();
  const period = hours24 >= 12 ? "PM" : "AM";
  const hour12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return { hour12, minute: date.getMinutes(), period: period as "AM" | "PM" };
}

function from12Hour(
  base: Date,
  hour12: number,
  minute: number,
  period: "AM" | "PM"
) {
  let hours24 = hour12 % 12;
  if (period === "PM") hours24 += 12;
  const next = new Date(base);
  next.setHours(hours24, minute, 0, 0);
  return next;
}

const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

export function DateTimeField({
  label,
  value,
  onChange,
  className,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const committed = useMemo(() => parseDateTimeFieldValue(value), [value]);
  const [draft, setDraft] = useState(committed);

  useEffect(() => {
    if (disabled) {
      setOpen(false);
    }
  }, [disabled]);

  useEffect(() => {
    if (open) {
      setDraft(committed);
    }
  }, [open, committed]);

  const { hour12, minute, period } = useMemo(() => to12Hour(draft), [draft]);

  function setDatePart(day: Date) {
    setDraft((prev) => {
      const next = new Date(prev);
      next.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());
      return next;
    });
  }

  function setToday() {
    const now = new Date();
    setDraft((prev) => {
      const next = new Date(prev);
      next.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
      return next;
    });
  }

  function setNow() {
    const now = new Date();
    setDraft((prev) => {
      const next = new Date(prev);
      next.setHours(now.getHours(), now.getMinutes(), 0, 0);
      return next;
    });
  }

  function patchTime(
    patch: Partial<{ hour12: number; minute: number; period: "AM" | "PM" }>
  ) {
    setDraft((prev) =>
      from12Hour(
        prev,
        patch.hour12 ?? to12Hour(prev).hour12,
        patch.minute ?? to12Hour(prev).minute,
        patch.period ?? to12Hour(prev).period
      )
    );
  }

  function handleSave() {
    onChange(formatDateTimeFieldValue(draft));
    setOpen(false);
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label>{label}</Label>
      <Popover
        open={disabled ? false : open}
        onOpenChange={(next) => {
          if (!disabled) setOpen(next);
        }}
      >
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              className={cn(
                "h-10 w-full justify-start gap-2 border-border bg-background font-normal",
                disabled && "cursor-not-allowed opacity-60"
              )}
            />
          }
        >
          <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
          <span
            className={cn(
              "truncate text-sm",
              disabled && "text-muted-foreground"
            )}
          >
            {disabled
              ? "Set when trade is closed"
              : format(committed, "MMM d, yyyy · h:mm a")}
          </span>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto max-w-[calc(100vw-2rem)] p-0"
          align="start"
        >
          <div className="flex flex-col sm:flex-row">
            <div className="border-b border-border sm:border-r sm:border-b-0">
              <Calendar
                mode="single"
                selected={draft}
                onSelect={(day) => day && setDatePart(day)}
                defaultMonth={draft}
              />
              <div className="flex border-t border-border p-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={setToday}
                >
                  Today
                </Button>
              </div>
            </div>

            <div className="flex min-w-[200px] flex-col gap-3 p-3">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Time
              </p>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Hour</Label>
                  <Select
                    value={String(hour12)}
                    onValueChange={(v) => v && patchTime({ hour12: Number(v) })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-48">
                      {HOURS_12.map((h) => (
                        <SelectItem key={h} value={String(h)}>
                          {pad2(h)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">
                    Minute
                  </Label>
                  <Select
                    value={String(minute)}
                    onValueChange={(v) => v && patchTime({ minute: Number(v) })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-48">
                      {MINUTES.map((m) => (
                        <SelectItem key={m} value={String(m)}>
                          {pad2(m)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">
                    Period
                  </Label>
                  <Select
                    value={period}
                    onValueChange={(v) =>
                      v && patchTime({ period: v as "AM" | "PM" })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AM">AM</SelectItem>
                      <SelectItem value="PM">PM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={setNow}>
                Now
              </Button>
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-border bg-muted/20 px-3 py-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={handleSave}>
              Save
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
