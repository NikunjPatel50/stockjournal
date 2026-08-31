"use client";

import { memo, useMemo } from "react";
import { cn, NUMERIC_CLASS } from "@/lib/utils";

const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

const ROLL_CLASS =
  "transition-transform duration-[520ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none";

/**
 * One column of 0–9 shifted so the active digit sits in the 1em window. The
 * hidden glyph sizes the cell, which keeps the column width exact regardless
 * of how the font renders tabular figures.
 */
const DigitReel = memo(function DigitReel({ digit }: { digit: number }) {
  return (
    <span className="relative inline-block h-[1em] overflow-hidden align-bottom">
      <span className="invisible block h-[1em] leading-none">0</span>
      <span
        className={cn("absolute inset-x-0 top-0 flex flex-col", ROLL_CLASS)}
        style={{ transform: `translateY(-${digit}em)` }}
      >
        {DIGITS.map((d) => (
          <span key={d} className="block h-[1em] leading-none">
            {d}
          </span>
        ))}
      </span>
    </span>
  );
});

/**
 * Keys run right-to-left so the decimals keep their identity when the integer
 * part grows or shrinks — only the new leading digit mounts.
 */
const Odometer = memo(function Odometer({ text }: { text: string }) {
  const chars = useMemo(() => Array.from(text), [text]);

  return (
    <span aria-hidden className="whitespace-nowrap">
      {chars.map((char, index) => {
        const key = chars.length - 1 - index;
        const code = char.charCodeAt(0);
        const isDigit = code >= 48 && code <= 57;

        return isDigit ? (
          <DigitReel key={key} digit={code - 48} />
        ) : (
          <span key={key}>{char}</span>
        );
      })}
    </span>
  );
});

type AnimatedNumberProps = {
  value: number;
  format: (value: number) => string;
  className?: string;
  title?: string;
};

export function AnimatedNumber({
  value,
  format,
  className,
  title,
}: AnimatedNumberProps) {
  const formatted = format(value);

  return (
    <span
      className={cn(NUMERIC_CLASS, "inline-block leading-none", className)}
      title={title ?? formatted}
    >
      <span className="sr-only">{formatted}</span>
      <Odometer text={formatted} />
    </span>
  );
}

type AnimatedValueProps = {
  value: number | string | null | undefined;
  format: (value: number) => string;
  className?: string;
  title?: string;
};

export function AnimatedValue({
  value,
  format,
  className,
  title,
}: AnimatedValueProps) {
  if (value == null || typeof value === "string") {
    const text = value ?? "—";
    return (
      <span className={cn(NUMERIC_CLASS, className)} title={title ?? text}>
        {text}
      </span>
    );
  }

  if (!Number.isFinite(value)) {
    return (
      <span className={cn(NUMERIC_CLASS, className)} title={title}>
        —
      </span>
    );
  }

  return (
    <AnimatedNumber
      value={value}
      format={format}
      className={className}
      title={title}
    />
  );
}

type AnimatedPercentProps = {
  value: number;
  decimals?: number;
  className?: string;
  signed?: boolean;
};

export function AnimatedPercent({
  value,
  decimals = 2,
  className,
  signed = true,
}: AnimatedPercentProps) {
  return (
    <AnimatedNumber
      value={value}
      format={(latest) =>
        signed
          ? `${latest >= 0 ? "+" : ""}${latest.toFixed(decimals)}%`
          : `${latest.toFixed(decimals)}%`
      }
      className={className}
    />
  );
}
