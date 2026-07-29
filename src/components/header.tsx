"use client";

import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import { HeaderActions } from "@/components/header-actions";
import { useSettings } from "@/components/settings/settings-provider";

const TIMEFRAME_LABELS: Record<string, string> = {
  "this-month": "THIS MONTH",
  ytd: "YTD",
  all: "ALL TIME",
};

interface HeaderProps {
  timeframe: string;
  onTimeframeChange: (value: string) => void;
}

export function Header({ timeframe, onTimeframeChange }: HeaderProps) {
  const { settings } = useSettings();
  const [date, setDate] = useState<Date>(new Date());
  const firstName = settings.profile.fullName.split(" ")[0] || "Trader";

  return (
    <header className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="pl-12 lg:pl-0">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Dashboard — Welcome back, {firstName}!
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your trading performance at a glance
          </p>
        </div>
        <HeaderActions />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Popover>
          <PopoverTrigger
            render={
              <Button
                variant="outline"
                className="gap-2 border-border bg-card"
              />
            }
          >
            <CalendarIcon className="size-4 text-muted-foreground" />
            <span className="text-sm">{format(date, "MMM d, yyyy")}</span>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(value) => value && setDate(value)}
            />
          </PopoverContent>
        </Popover>

        <Select
          value={timeframe}
          onValueChange={(value) => {
            if (value) onTimeframeChange(value);
          }}
        >
          <SelectTrigger className="w-[150px] border-border bg-card uppercase">
            <SelectValue>
              {(value) =>
                TIMEFRAME_LABELS[String(value ?? "")] ?? String(value ?? "")
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="this-month">THIS MONTH</SelectItem>
            <SelectItem value="ytd">YTD</SelectItem>
            <SelectItem value="all">ALL TIME</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </header>
  );
}
