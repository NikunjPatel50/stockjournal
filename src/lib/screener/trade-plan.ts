import { emaSeries } from "@/lib/screener/ema";
import type { ScreenerChartPoint } from "@/lib/screener/types";

export type SetupKind = "ema" | "turtle" | "momentum";

export type TradePlan = {
  frame: "Daily" | "Weekly";
  action: "now" | "above" | "pullback";
  entry: number;
  stop: number;
  target: number;
  rewardRisk: number;
  strength: number;
  reason: string;
  patterns: string[];
  /** How the strength score was built. Shown as a tooltip. */
  breakdown: string;
};

type TradeBar = {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type CandleFacts = {
  labels: string[];
  bullishEngulfing: boolean;
  bearishEngulfing: boolean;
  hammer: boolean;
  shootingStar: boolean;
  marubozu: boolean;
  morningStar: boolean;
  doji: boolean;
  insideBar: boolean;
  higherClose: boolean;
  green: boolean;
  closeLocation: number;
  bodyRatio: number;
};

function roundPrice(value: number): number {
  return Math.round(value * 100) / 100;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function latest(series: Array<number | null>): number | null {
  for (let index = series.length - 1; index >= 0; index -= 1) {
    const value = series[index];
    if (value != null && value > 0) return value;
  }
  return null;
}

function toTradeBars(chart: ScreenerChartPoint[]): TradeBar[] {
  const bars: TradeBar[] = [];
  for (const point of chart) {
    if (!Number.isFinite(point.close) || point.close <= 0) continue;
    const open =
      point.open != null && point.open > 0 ? point.open : point.close;
    const highRaw =
      point.high != null && point.high > 0 ? point.high : point.close;
    const lowRaw = point.low != null && point.low > 0 ? point.low : point.close;
    bars.push({
      open,
      high: Math.max(highRaw, open, point.close),
      low: Math.min(lowRaw, open, point.close),
      close: point.close,
      volume: point.volume != null && point.volume > 0 ? point.volume : 0,
    });
  }
  return bars;
}

function wilderRsi(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;
  let gain = 0;
  let loss = 0;
  for (let index = 1; index <= period; index += 1) {
    const diff = closes[index]! - closes[index - 1]!;
    if (diff >= 0) gain += diff;
    else loss -= diff;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  for (let index = period + 1; index < closes.length; index += 1) {
    const diff = closes[index]! - closes[index - 1]!;
    const up = diff > 0 ? diff : 0;
    const down = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + up) / period;
    avgLoss = (avgLoss * (period - 1) + down) / period;
  }
  if (avgLoss === 0) return avgGain > 0 ? 100 : 50;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function wilderAtr(bars: TradeBar[], period = 14): number | null {
  if (bars.length < period + 1) return null;
  const rangeAt = (index: number) => {
    const bar = bars[index]!;
    const prevClose = bars[index - 1]!.close;
    return Math.max(
      bar.high - bar.low,
      Math.abs(bar.high - prevClose),
      Math.abs(bar.low - prevClose)
    );
  };
  let atr = 0;
  for (let index = 1; index <= period; index += 1) atr += rangeAt(index);
  atr /= period;
  for (let index = period + 1; index < bars.length; index += 1) {
    atr = (atr * (period - 1) + rangeAt(index)) / period;
  }
  return atr > 0 ? atr : null;
}

function readCandles(bars: TradeBar[], atr: number | null): CandleFacts {
  const empty: CandleFacts = {
    labels: [],
    bullishEngulfing: false,
    bearishEngulfing: false,
    hammer: false,
    shootingStar: false,
    marubozu: false,
    morningStar: false,
    doji: false,
    insideBar: false,
    higherClose: false,
    green: false,
    closeLocation: 0.5,
    bodyRatio: 1,
  };
  const last = bars[bars.length - 1];
  const prev = bars[bars.length - 2];
  const prior = bars[bars.length - 3];
  if (!last) return empty;

  const range = last.high - last.low;
  const body = Math.abs(last.close - last.open);
  const upper = last.high - Math.max(last.close, last.open);
  const lower = Math.min(last.close, last.open) - last.low;
  const green = last.close >= last.open;
  const closeLocation = range > 0 ? (last.close - last.low) / range : 0.5;
  const bodyRatio = range > 0 ? body / range : 1;
  const minRange = Math.max(atr != null ? atr * 0.35 : 0, last.close * 0.003);
  const labels: string[] = [];

  const facts: CandleFacts = {
    ...empty,
    green,
    closeLocation,
    bodyRatio,
    higherClose: prev != null && last.close > prev.close && last.low >= prev.low,
  };

  if (range >= minRange && lower >= body * 2 && upper <= Math.max(body, range * 0.25) && lower >= range * 0.5) {
    facts.hammer = true;
    labels.push(green ? "Hammer" : "Dragonfly");
  } else if (
    range >= minRange &&
    upper >= body * 2 &&
    lower <= Math.max(body, range * 0.25) &&
    upper >= range * 0.5
  ) {
    facts.shootingStar = true;
    labels.push("Shooting star");
  } else if (range >= minRange && bodyRatio >= 0.75 && green && (prev == null || last.close > prev.close)) {
    facts.marubozu = true;
    labels.push("Marubozu");
  } else if (range >= minRange * 0.5 && bodyRatio <= 0.12) {
    facts.doji = true;
    labels.push("Doji");
  }

  if (prev && green && prev.close < prev.open) {
    const bodyLow = Math.min(last.open, last.close);
    const bodyHigh = Math.max(last.open, last.close);
    const prevLow = Math.min(prev.open, prev.close);
    const prevHigh = Math.max(prev.open, prev.close);
    if (bodyLow <= prevLow && bodyHigh >= prevHigh && body > Math.abs(prev.close - prev.open)) {
      facts.bullishEngulfing = true;
      labels.unshift("Bullish engulfing");
    }
  }

  if (prev && !green && prev.close > prev.open) {
    const bodyLow = Math.min(last.open, last.close);
    const bodyHigh = Math.max(last.open, last.close);
    const prevLow = Math.min(prev.open, prev.close);
    const prevHigh = Math.max(prev.open, prev.close);
    if (bodyLow <= prevLow && bodyHigh >= prevHigh) {
      facts.bearishEngulfing = true;
      labels.unshift("Bearish engulfing");
    }
  }

  if (prev && prior) {
    const firstBear = prior.close < prior.open;
    const midSmall =
      Math.abs(prev.close - prev.open) <= Math.abs(prior.close - prior.open) * 0.6;
    const thirdBull =
      green && last.close > (prior.open + prior.close) / 2 && last.close > prev.high;
    if (firstBear && midSmall && thirdBull) {
      facts.morningStar = true;
      labels.unshift("Morning star");
    }
  }

  if (prev && last.high <= prev.high && last.low >= prev.low) {
    facts.insideBar = true;
    labels.push("Inside bar");
  }

  facts.labels = [...new Set(labels)].slice(0, 3);
  return facts;
}

function scoreCandles(
  kind: SetupKind,
  facts: CandleFacts
): { score: number; labels: string[] } {
  const labels = facts.labels.slice(0, 2);
  const bearish = facts.shootingStar || facts.bearishEngulfing;

  if (kind === "momentum") {
    if (bearish) return { score: 4, labels };
    if (facts.insideBar) return { score: 17, labels: labels.length ? labels : ["Inside bar"] };
    if (facts.doji || facts.bodyRatio < 0.35) {
      return { score: 14, labels: labels.length ? labels : ["Tight candle"] };
    }
    if (facts.bullishEngulfing || facts.marubozu) return { score: 16, labels };
    if (facts.green && facts.closeLocation >= 0.65) return { score: 12, labels };
    return { score: 8, labels };
  }

  if (kind === "turtle") {
    if (bearish) return { score: 3, labels };
    if (facts.marubozu || (facts.green && facts.closeLocation >= 0.8)) {
      return { score: 18, labels: labels.length ? labels : ["Strong close"] };
    }
    if (facts.bullishEngulfing) return { score: 16, labels };
    if (facts.green && facts.closeLocation >= 0.6) return { score: 12, labels };
    return { score: 6, labels };
  }

  if (bearish) return { score: 3, labels };
  if (facts.bullishEngulfing || facts.morningStar) return { score: 18, labels };
  if (facts.hammer) return { score: 16, labels };
  if (facts.green && facts.higherClose) {
    return { score: 11, labels: labels.length ? labels : ["Higher close"] };
  }
  if (facts.doji) return { score: 7, labels };
  return { score: 5, labels };
}

function scoreRsi(kind: SetupKind, rsi: number | null): number {
  if (rsi == null) return 7;
  if (kind === "ema") {
    if (rsi >= 40 && rsi <= 58) return 15;
    if (rsi >= 32 && rsi < 40) return 12;
    if (rsi > 58 && rsi <= 66) return 9;
    if (rsi > 66 && rsi <= 72) return 5;
    if (rsi < 32) return 8;
    return 2;
  }
  if (rsi >= 55 && rsi <= 68) return 15;
  if (rsi >= 48 && rsi < 55) return 11;
  if (rsi > 68 && rsi <= 74) return 8;
  if (rsi > 74 && rsi <= 80) return 4;
  if (rsi >= 40 && rsi < 48) return 6;
  return 2;
}

function scoreTrend(
  price: number,
  ema20: number | null,
  ema50: number | null,
  ema200: number | null
): number {
  let score = 0;
  if (ema20 != null && price > ema20) score += 6;
  if (ema50 != null && price > ema50) score += 6;
  if (ema200 != null && price > ema200) score += 5;
  if (
    ema20 != null &&
    ema50 != null &&
    ema200 != null &&
    ema20 > ema50 &&
    ema50 > ema200
  ) {
    score += 3;
  }
  return score;
}

function scoreLocation(
  kind: SetupKind,
  price: number,
  level: number | null,
  trigger: number | null
): number {
  if (kind === "ema" && level != null && level > 0) {
    const dist = (price - level) / level;
    if (dist < 0) return 4;
    if (dist <= 0.012) return 10;
    if (dist <= 0.03) return 7;
    return 3;
  }
  if (kind === "turtle" && level != null && level > 0) {
    const dist = (price - level) / level;
    if (dist < 0) return 3;
    if (dist <= 0.01) return 10;
    if (dist <= 0.025) return 7;
    if (dist <= 0.04) return 4;
    return 2;
  }
  if (kind === "momentum" && trigger != null && trigger > 0) {
    const dist = Math.abs(price - trigger) / trigger;
    if (dist <= 0.015) return 10;
    if (dist <= 0.03) return 7;
    return 4;
  }
  return 5;
}

function scoreVolume(
  kind: SetupKind,
  bars: TradeBar[]
): { score: number; label: string | null } {
  const last = bars[bars.length - 1];
  if (!last || last.volume <= 0) return { score: 8, label: null };
  const prior = bars
    .slice(-21, -1)
    .map((bar) => bar.volume)
    .filter((volume) => volume > 0);
  const avg = average(prior);
  if (avg == null || avg <= 0 || prior.length < 5) return { score: 8, label: null };

  const rel = last.volume / avg;
  const label = `${rel.toFixed(1)}× volume`;
  const green = last.close >= last.open;

  if (kind === "momentum") {
    if (!green && rel < 0.85) return { score: 14, label };
    if (rel < 1) return { score: 12, label };
    if (green && rel >= 1.4) return { score: 13, label };
    return { score: 8, label };
  }

  if (!green && rel >= 1.4) return { score: 3, label };
  if (green && rel >= 1.8) return { score: 15, label };
  if (green && rel >= 1.4) return { score: 13, label };
  if (green && rel >= 1.1) return { score: 9, label };
  if (kind === "ema" && !green && rel < 1) return { score: 10, label };
  return { score: 6, label };
}

function scoreReward(rewardRisk: number): number {
  if (rewardRisk >= 3) return 20;
  if (rewardRisk >= 2) return 17;
  if (rewardRisk >= 1.5) return 12;
  if (rewardRisk >= 1.2) return 7;
  if (rewardRisk >= 1) return 4;
  return 0;
}

function swingLow(bars: TradeBar[], lookback: number): number | null {
  const slice = bars.slice(-lookback);
  if (slice.length === 0) return null;
  return Math.min(...slice.map((bar) => bar.low));
}

function nearestResistance(
  bars: TradeBar[],
  entry: number,
  minDistance: number
): number | null {
  let nearest = Infinity;
  for (const bar of bars.slice(-60, -1)) {
    if (bar.high >= entry + minDistance && bar.high < nearest) nearest = bar.high;
  }
  return Number.isFinite(nearest) ? nearest : null;
}

function chooseEntry(input: {
  kind: SetupKind;
  price: number;
  last: TradeBar;
  rsi: number | null;
  ema20: number | null;
  level: number | null;
  trigger: number | null;
  facts: CandleFacts;
}): { action: TradePlan["action"]; entry: number; reason: string } {
  const { kind, price, last, facts } = input;
  const reversal = facts.hammer || facts.bullishEngulfing || facts.morningStar;
  const bearish = facts.shootingStar || facts.bearishEngulfing;
  const strongClose = facts.marubozu || (facts.green && facts.closeLocation >= 0.75);
  const pattern = facts.labels[0];

  if (kind === "momentum" && input.trigger != null && input.trigger > 0) {
    const trigger = roundPrice(input.trigger);
    if (price <= trigger * 1.003) {
      return {
        action: "above",
        entry: trigger,
        reason: "Buy when price clears the base high",
      };
    }
    if (price >= trigger * 1.03) {
      return {
        action: "pullback",
        entry: trigger,
        reason: "Extended above the base — wait for a retest",
      };
    }
    return {
      action: "now",
      entry: roundPrice(price),
      reason: "Base high is cleared and price is still near it",
    };
  }

  if (kind === "turtle" && input.level != null && input.level > 0) {
    const extension = (price - input.level) / input.level;
    if (extension >= 0.025 || (bearish && input.level < price * 0.995)) {
      return {
        action: "pullback",
        entry: roundPrice(input.level),
        reason: bearish
          ? pattern
            ? `${pattern} on the breakout — wait for a retest`
            : "Weak breakout candle — wait for a retest of the channel"
          : "Breakout is extended — buy a retest of the channel",
      };
    }
    if (!bearish && (strongClose || extension <= 0.012)) {
      return {
        action: "now",
        entry: roundPrice(price),
        reason: pattern
          ? `${pattern} on a fresh channel break`
          : "Fresh breakout with the close near the high",
      };
    }
    if (price >= last.high) {
      return {
        action: "now",
        entry: roundPrice(price),
        reason: "Price is through the breakout bar",
      };
    }
    return {
      action: "above",
      entry: roundPrice(last.high),
      reason: "Buy above the breakout bar high",
    };
  }

  const stretched =
    (input.rsi != null && input.rsi >= 72) ||
    (input.ema20 != null &&
      input.ema20 > 0 &&
      (price - input.ema20) / input.ema20 > 0.04);

  if (stretched && input.ema20 != null && input.ema20 < price * 0.995) {
    return {
      action: "pullback",
      entry: roundPrice(input.ema20),
      reason: "Stretched above the 20 EMA — wait for a pullback",
    };
  }

  if (bearish) {
    const pullback =
      input.ema20 != null && input.ema20 < price * 0.995
        ? input.ema20
        : input.level != null && input.level < price * 0.995
          ? input.level
          : null;
    if (pullback != null) {
      return {
        action: "pullback",
        entry: roundPrice(pullback),
        reason: pattern
          ? `${pattern} — wait for a pullback before entering`
          : "Bearish candle — wait for a pullback",
      };
    }
  }

  if (reversal && !bearish && (input.rsi == null || input.rsi <= 70)) {
    return {
      action: "now",
      entry: roundPrice(price),
      reason: pattern ? `${pattern} holding the 200 EMA` : "Bullish candle holding the 200 EMA",
    };
  }

  if (price >= last.high * 0.999) {
    return {
      action: "now",
      entry: roundPrice(price),
      reason: "Price is holding the 200 EMA",
    };
  }

  return {
    action: "above",
    entry: roundPrice(last.high),
    reason: "No reversal candle yet — buy above the bar high",
  };
}

function pickStop(input: {
  kind: SetupKind;
  entry: number;
  atr: number | null;
  swing: number | null;
  level: number | null;
  invalidation: number | null;
}): { stop: number; note: string } {
  const atrValue =
    input.atr != null && input.atr > 0 ? input.atr : input.entry * 0.015;
  const buffer = atrValue * 0.2;
  const noise = atrValue * 0.6;
  const below = (value: number | null) =>
    value != null && value < input.entry ? value - buffer : null;

  if (input.kind === "turtle") {
    const atrStop = input.entry - 2 * atrValue;
    const signal = below(input.invalidation);
    const signalDistance = signal != null ? input.entry - signal : null;
    const stop =
      signal != null &&
      signalDistance != null &&
      signalDistance >= atrValue &&
      signalDistance <= atrValue * 2.5
        ? signal
        : atrStop;
    return {
      stop: roundPrice(Math.min(stop, input.entry - noise)),
      note: "Stop is beyond the breakout bar, about 1–2 ATR under the entry",
    };
  }

  if (input.kind === "momentum") {
    const base = below(input.invalidation) ?? below(input.swing) ?? input.entry - 1.5 * atrValue;
    return {
      stop: roundPrice(Math.min(base, input.entry - noise)),
      note: "Stop is under the base low",
    };
  }

  const anchors = [below(input.swing), below(input.level)].filter(
    (value): value is number => value != null
  );
  const structural = anchors.length > 0 ? Math.min(...anchors) : input.entry - 1.5 * atrValue;
  return {
    stop: roundPrice(Math.min(structural, input.entry - noise)),
    note: "Stop is under the 200 EMA and the recent swing low",
  };
}

function pickTarget(
  bars: TradeBar[],
  entry: number,
  risk: number,
  measured: number | null
): { target: number; label: string } {
  const twoR = entry + 2 * risk;
  const resistance = nearestResistance(bars, entry, risk * 1.4);
  if (resistance != null && resistance <= entry + risk * 3.2) {
    return { target: roundPrice(resistance), label: "the prior high" };
  }
  if (
    measured != null &&
    measured >= entry + risk * 1.5 &&
    measured <= entry + risk * 4
  ) {
    return { target: roundPrice(measured), label: "the measured move" };
  }
  return { target: roundPrice(twoR), label: "2R" };
}

/**
 * Long setup from the latest candles: entry timing, a structural stop, a
 * profit target, and a 0–100 strength score.
 *
 * Strength is the sum of six checks (trend 20, RSI 15, candles 20, volume 15,
 * reward 20, location 10), then small penalties for a hot RSI or a stop that
 * is either very wide or inside the noise.
 */
export function buildTradePlan(
  chart: ScreenerChartPoint[],
  input: {
    kind: SetupKind;
    frame: "Daily" | "Weekly";
    price: number;
    level?: number | null;
    trigger?: number | null;
    invalidation?: number | null;
  }
): TradePlan | null {
  const bars = toTradeBars(chart);
  const price = input.price;
  if (bars.length < 8 || !Number.isFinite(price) || price <= 0) return null;

  const last = bars[bars.length - 1]!;
  const closes = bars.map((bar) => bar.close);
  const atr = wilderAtr(bars);
  const rsi = wilderRsi(closes);
  const ema20 = latest(emaSeries(closes, 20));
  const ema50 = latest(emaSeries(closes, 50));
  const ema200 = latest(emaSeries(closes, 200));
  const facts = readCandles(bars, atr);
  const candles = scoreCandles(input.kind, facts);

  let { action, entry, reason } = chooseEntry({
    kind: input.kind,
    price,
    last,
    rsi,
    ema20,
    level: input.level ?? null,
    trigger: input.trigger ?? null,
    facts,
  });

  if (action === "above" && price >= entry) {
    action = "now";
    entry = roundPrice(price);
  }
  if (action === "pullback" && entry >= price * 0.998) {
    action = "now";
    entry = roundPrice(price);
    reason = "Pullback has reached the level";
  }

  const stopPick = pickStop({
    kind: input.kind,
    entry,
    atr,
    swing: swingLow(bars, input.frame === "Weekly" ? 4 : 6),
    level: input.level ?? ema200,
    invalidation: input.invalidation ?? null,
  });
  const stop = stopPick.stop;
  const risk = entry - stop;
  if (!(risk > 0) || risk / entry > 0.25) return null;

  const measured =
    input.trigger != null &&
    input.invalidation != null &&
    input.trigger > input.invalidation
      ? input.trigger + 2 * (input.trigger - input.invalidation)
      : null;
  const targetPick = pickTarget(bars, entry, risk, measured);
  if (!(targetPick.target > entry)) return null;

  const rewardRisk =
    Math.round(((targetPick.target - entry) / risk) * 10) / 10;
  if (!Number.isFinite(rewardRisk) || rewardRisk <= 0) return null;

  const trend = scoreTrend(price, ema20, ema50, ema200);
  const rsiPoints = scoreRsi(input.kind, rsi);
  const location = scoreLocation(
    input.kind,
    price,
    input.level ?? null,
    input.trigger ?? null
  );
  const volume = scoreVolume(input.kind, bars);
  const reward = scoreReward(rewardRisk);

  let strength = trend + rsiPoints + candles.score + volume.score + reward + location;
  if (rsi != null && rsi > 78) strength -= 6;
  if (risk / entry > 0.1) strength -= 5;
  if (risk / entry < 0.005) strength -= 4;
  strength = Math.max(0, Math.min(100, Math.round(strength)));
  if (action === "pullback") strength = Math.min(strength, 68);

  const patterns = [...candles.labels];
  if (rsi != null) patterns.push(`RSI ${Math.round(rsi)}`);
  if (volume.label && patterns.length < 3) patterns.push(volume.label);
  if (
    patterns.length < 3 &&
    ema20 != null &&
    ema50 != null &&
    ema200 != null &&
    ema20 > ema50 &&
    ema50 > ema200
  ) {
    patterns.push("EMA stack");
  }

  const breakdown = [
    reason,
    stopPick.note,
    `Target is ${targetPick.label}`,
    `Trend ${trend}/20`,
    `RSI ${rsiPoints}/15`,
    `candles ${candles.score}/20`,
    `volume ${volume.score}/15`,
    `reward ${reward}/20`,
    `location ${location}/10`,
  ].join(" · ");

  return {
    frame: input.frame,
    action,
    entry,
    stop,
    target: targetPick.target,
    rewardRisk,
    strength,
    reason,
    patterns: patterns.slice(0, 3),
    breakdown,
  };
}
