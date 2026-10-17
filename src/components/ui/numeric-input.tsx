"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";

function formatNumeric(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "";
  return String(value);
}

function parseNumeric(raw: string): number | null | undefined {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "-" || trimmed === "." || trimmed === "-.") {
    return null;
  }
  if (!/^-?\d*\.?\d*$/.test(trimmed)) return undefined;
  const next = Number(trimmed);
  return Number.isFinite(next) ? next : undefined;
}

/**
 * Text-backed number field. Clearing it stays blank instead of writing 0.
 * `null` from `onValueChange` means the field is empty.
 */
export function NumericInput({
  value,
  onValueChange,
  onFocus,
  onBlur,
  onKeyDown,
  ...props
}: {
  value: number | null | undefined;
  onValueChange: (next: number | null) => void;
} & Omit<
  React.ComponentProps<typeof Input>,
  "value" | "onChange" | "type" | "defaultValue"
>) {
  const formatted = formatNumeric(value);
  const [text, setText] = useState(formatted);
  const [focused, setFocused] = useState(false);
  const [blank, setBlank] = useState(false);
  const [tracked, setTracked] = useState(formatted);

  if (tracked !== formatted) {
    setTracked(formatted);
    if (!focused) {
      setBlank(false);
      setText(formatted);
    }
  }

  return (
    <Input
      {...props}
      type="text"
      inputMode="decimal"
      value={focused ? text : blank ? "" : formatted}
      onFocus={(event) => {
        setFocused(true);
        setText(blank ? "" : formatted);
        const input = event.currentTarget;
        requestAnimationFrame(() => input.select());
        onFocus?.(event);
      }}
      onChange={(event) => {
        const next = event.target.value;
        if (next !== "" && !/^-?\d*\.?\d*$/.test(next)) return;
        setText(next);
        const parsed = parseNumeric(next);
        if (parsed === undefined) return;
        setBlank(parsed == null);
        onValueChange(parsed);
      }}
      onBlur={(event) => {
        setFocused(false);
        const parsed = parseNumeric(text);
        if (parsed == null) {
          setBlank(true);
          setText("");
          onValueChange(null);
        } else {
          setBlank(false);
          setText(String(parsed));
        }
        onBlur?.(event);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
        onKeyDown?.(event);
      }}
    />
  );
}
