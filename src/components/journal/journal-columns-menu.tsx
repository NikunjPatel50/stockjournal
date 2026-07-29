"use client";

import { ChevronDown, ChevronUp, Columns3, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  defaultJournalColumnPrefs,
  JOURNAL_REORDERABLE_COLUMNS,
  moveJournalColumn,
  type JournalColumnPrefs,
} from "@/lib/journal-column-prefs";

interface JournalColumnsMenuProps {
  prefs: JournalColumnPrefs;
  onChange: (prefs: JournalColumnPrefs) => void;
}

export function JournalColumnsMenu({ prefs, onChange }: JournalColumnsMenuProps) {
  const orderedMiddle = prefs.order.filter((id) => id !== "actions");

  function setVisibility(columnId: string, visible: boolean) {
    onChange({
      ...prefs,
      visibility: { ...prefs.visibility, [columnId]: visible },
    });
  }

  function move(columnId: string, direction: "up" | "down") {
    onChange({
      ...prefs,
      order: moveJournalColumn(prefs.order, columnId, direction),
    });
  }

  function reset() {
    onChange(defaultJournalColumnPrefs());
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 shrink-0"
          />
        }
      >
        <Columns3 className="size-3.5" />
        Columns
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="end">
        <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
          <p className="text-sm font-medium">Table columns</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs text-muted-foreground"
            onClick={reset}
          >
            <RotateCcw className="size-3" />
            Reset
          </Button>
        </div>
        <ul className="max-h-[min(60vh,320px)] overflow-y-auto p-2">
          {orderedMiddle.map((columnId, index) => {
            const meta = JOURNAL_REORDERABLE_COLUMNS.find(
              (c) => c.id === columnId
            );
            if (!meta) return null;
            const visible = prefs.visibility[columnId] !== false;
            return (
              <li
                key={columnId}
                className="flex items-center gap-2 rounded-md px-1 py-1.5 hover:bg-muted/50"
              >
                <Checkbox
                  checked={visible}
                  onCheckedChange={(checked) =>
                    setVisibility(columnId, !!checked)
                  }
                  aria-label={`Show ${meta.label}`}
                />
                <span className="min-w-0 flex-1 truncate text-sm">
                  {meta.label}
                </span>
                <div className="flex shrink-0 items-center gap-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="size-7"
                    disabled={index === 0}
                    aria-label={`Move ${meta.label} up`}
                    onClick={() => move(columnId, "up")}
                  >
                    <ChevronUp className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="size-7"
                    disabled={index === orderedMiddle.length - 1}
                    aria-label={`Move ${meta.label} down`}
                    onClick={() => move(columnId, "down")}
                  >
                    <ChevronDown className="size-3.5" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
          Toggle visibility or use arrows to reorder. Actions stays fixed on the
          right.
        </p>
      </PopoverContent>
    </Popover>
  );
}
