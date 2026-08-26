"use client";

import { cn, NUMERIC_CLASS } from "@/lib/utils";

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
    <span className={cn(NUMERIC_CLASS, className)} title={title ?? formatted}>
      {formatted}
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
