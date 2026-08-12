import type { JournalDirection } from "@/lib/journal-types";

export type TargetStopProgress = {
  /** Progress toward profit target from entry (0–100+). */
  targetPct: number;
  /** Progress toward stop loss from entry (0–100+). */
  stopPct: number;
  /** 0 = at target (left), 1 = at stop (right). */
  barPosition: number;
  /** Where entry sits on the bar (0–1). */
  entryBarPosition: number;
  hasTarget: boolean;
  hasStop: boolean;
};

function hasDistinctLevel(price: number, entry: number): boolean {
  return price > 0 && Math.abs(price - entry) / entry > 0.000_01;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function computeTargetStopProgress(input: {
  direction: JournalDirection;
  entryPrice: number;
  profitTarget: number;
  stopLoss: number;
  currentPrice: number;
}): TargetStopProgress | null {
  const { direction, entryPrice, profitTarget, stopLoss, currentPrice } = input;

  if (!Number.isFinite(currentPrice) || currentPrice <= 0 || entryPrice <= 0) {
    return null;
  }

  const hasTarget = hasDistinctLevel(profitTarget, entryPrice);
  const hasStop = hasDistinctLevel(stopLoss, entryPrice);
  if (!hasTarget && !hasStop) return null;

  const isShort = direction === "Short";

  let targetPct = 0;
  let stopPct = 0;

  if (hasTarget) {
    const targetDistance = isShort
      ? entryPrice - profitTarget
      : profitTarget - entryPrice;
    const traveledToTarget = isShort
      ? entryPrice - currentPrice
      : currentPrice - entryPrice;
    if (targetDistance > 0) {
      targetPct = Math.max(0, (traveledToTarget / targetDistance) * 100);
    }
  }

  if (hasStop) {
    const stopDistance = isShort
      ? stopLoss - entryPrice
      : entryPrice - stopLoss;
    const traveledToStop = isShort
      ? currentPrice - entryPrice
      : entryPrice - currentPrice;
    if (stopDistance > 0) {
      stopPct = Math.max(0, (traveledToStop / stopDistance) * 100);
    }
  }

  let barPosition = 0.5;
  let entryBarPosition = 0.5;

  if (hasTarget && hasStop) {
    const span = isShort ? stopLoss - profitTarget : profitTarget - stopLoss;
    if (span > 0) {
      const offsetFromTarget = (price: number) =>
        isShort ? price - profitTarget : profitTarget - price;
      barPosition = clamp(offsetFromTarget(currentPrice) / span, 0, 1);
      entryBarPosition = clamp(offsetFromTarget(entryPrice) / span, 0, 1);
    }
  } else if (hasTarget) {
    entryBarPosition = 1;
    barPosition = clamp(1 - targetPct / 100, 0, 1);
  } else if (hasStop) {
    entryBarPosition = 0;
    barPosition = clamp(stopPct / 100, 0, 1);
  }

  return {
    targetPct,
    stopPct,
    barPosition,
    entryBarPosition,
    hasTarget,
    hasStop,
  };
}

export function formatProgressPct(value: number) {
  if (!Number.isFinite(value)) return "—";
  return `${Math.round(value)}%`;
}

export function getTargetStopStatusLabel(progress: TargetStopProgress): {
  text: string;
  tone: string;
} {
  const { targetPct, stopPct, hasTarget, hasStop } = progress;

  if (hasTarget && targetPct >= 100) {
    return {
      text: "At target",
      tone: "text-emerald-700 dark:text-emerald-400",
    };
  }

  if (hasStop && stopPct >= 100) {
    return {
      text: "At stop",
      tone: "text-rose-700 dark:text-rose-400",
    };
  }

  if (stopPct > 0 && (!hasTarget || stopPct > targetPct)) {
    return {
      text: `${Math.round(stopPct)}% to stop`,
      tone: "text-rose-700 dark:text-rose-400",
    };
  }

  if (targetPct > 0) {
    return {
      text: `${Math.round(targetPct)}% to target`,
      tone: "text-emerald-700 dark:text-emerald-400",
    };
  }

  return {
    text: "At entry",
    tone: "text-muted-foreground",
  };
}

/** Blink the progress marker when price has moved >50% toward target or stop. */
export function getTargetStopMarkerBlink(
  progress: TargetStopProgress
): "green" | "red" | null {
  if (progress.stopPct > 50 && progress.targetPct > 50) {
    return progress.stopPct >= progress.targetPct ? "red" : "green";
  }
  if (progress.stopPct > 50) return "red";
  if (progress.targetPct > 50) return "green";
  return null;
}
