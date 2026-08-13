import {
  outcomeFromPnl,
  type ExecutionFill,
  type JournalTrade,
} from "@/lib/journal-types";

export type PartialExitInput = {
  exitPrice: number;
  quantity: number;
  exitDate: string;
  /** Extra fees for this exit leg (on top of proportional entry fees). */
  fees?: number;
};

export type PartialExitResult = {
  closedLot: JournalTrade;
  /** Null when the full position was sold. */
  updatedActive: JournalTrade | null;
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function computeClosedTradeMetrics(
  trade: JournalTrade,
  input: PartialExitInput,
  quantity: number,
  fees: number
): Pick<
  JournalTrade,
  "pnl" | "roi" | "outcome" | "holdTimeHours" | "realizedRisk" | "plannedRisk"
> {
  const gross =
    trade.direction === "Long"
      ? (input.exitPrice - trade.entryPrice) * quantity
      : (trade.entryPrice - input.exitPrice) * quantity;
  const pnl = round2(gross - fees);
  const notional = trade.entryPrice * quantity;
  const roi = notional ? round2((pnl / notional) * 100) : 0;
  const holdMs =
    new Date(input.exitDate).getTime() - new Date(trade.entryDate).getTime();
  const holdTimeHours = round2(Math.max(holdMs / (1000 * 60 * 60), 0));
  const plannedRisk = round2(
    Math.abs(trade.entryPrice - trade.stopLoss) * quantity
  );

  return {
    pnl,
    roi,
    outcome: outcomeFromPnl(pnl),
    holdTimeHours,
    plannedRisk,
    realizedRisk: pnl < 0 ? Math.abs(pnl) : 0,
  };
}

function buildExecutions(
  trade: JournalTrade,
  input: PartialExitInput,
  quantity: number,
  entryFees: number,
  exitFees: number
): ExecutionFill[] {
  return [
    {
      id: crypto.randomUUID(),
      time: trade.entryDate,
      side: "Entry",
      price: trade.entryPrice,
      quantity,
      fees: entryFees,
    },
    {
      id: crypto.randomUUID(),
      time: input.exitDate,
      side: quantity === trade.quantity ? "Exit" : "Scale Out",
      price: input.exitPrice,
      quantity,
      fees: exitFees,
    },
  ];
}

export function previewPartialExitPnl(
  trade: JournalTrade,
  input: PartialExitInput
): number {
  const soldQty = input.quantity;
  if (soldQty <= 0 || soldQty > trade.quantity) return 0;
  const feeRatio = soldQty / trade.quantity;
  const allocatedEntryFees = (trade.fees ?? 0) * feeRatio;
  const exitFees = input.fees ?? 0;
  return computeClosedTradeMetrics(trade, input, soldQty, allocatedEntryFees + exitFees)
    .pnl;
}

export function applyPartialExit(
  trade: JournalTrade,
  input: PartialExitInput
): PartialExitResult {
  if ((trade.status ?? "Closed") !== "Active") {
    throw new Error("Only active trades can be partially exited.");
  }

  const soldQty = input.quantity;
  if (!Number.isFinite(soldQty) || soldQty <= 0) {
    throw new Error("Quantity must be greater than zero.");
  }
  if (soldQty > trade.quantity) {
    throw new Error("Cannot sell more than the open quantity.");
  }
  if (!Number.isFinite(input.exitPrice) || input.exitPrice <= 0) {
    throw new Error("Exit price is required.");
  }

  const remainingQty = round2(trade.quantity - soldQty);
  const feeRatio = soldQty / trade.quantity;
  const allocatedEntryFees = round2((trade.fees ?? 0) * feeRatio);
  const exitFees = round2(input.fees ?? 0);
  const closedFees = round2(allocatedEntryFees + exitFees);
  const remainingFees = round2((trade.fees ?? 0) - allocatedEntryFees);
  const closedMetrics = computeClosedTradeMetrics(
    trade,
    input,
    soldQty,
    closedFees
  );

  const closedLot: JournalTrade = {
    ...trade,
    id: remainingQty > 0 ? crypto.randomUUID() : trade.id,
    status: "Closed",
    quantity: soldQty,
    exitPrice: input.exitPrice,
    exitDate: input.exitDate,
    fees: closedFees,
    ...closedMetrics,
    executions: buildExecutions(trade, input, soldQty, allocatedEntryFees, exitFees),
  };

  if (remainingQty <= 0) {
    return { closedLot, updatedActive: null };
  }

  const scaleOutFill: ExecutionFill = {
    id: crypto.randomUUID(),
    time: input.exitDate,
    side: "Scale Out",
    price: input.exitPrice,
    quantity: soldQty,
    fees: exitFees,
  };

  const updatedActive: JournalTrade = {
    ...trade,
    quantity: remainingQty,
    fees: remainingFees,
    plannedRisk: round2(Math.abs(trade.entryPrice - trade.stopLoss) * remainingQty),
    executions: [...(trade.executions ?? []), scaleOutFill],
  };

  return { closedLot, updatedActive };
}
