/** Dark-theme annotated weekly charts for the breakout strategy blog post. */

const SVG_OPEN = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 440" role="img" aria-hidden="true">`;
const BG = `<rect width="800" height="440" fill="#131722"/>`;
const GRID = `
  <g stroke="#1e293b" stroke-width="1">
    <line x1="60" y1="60" x2="760" y2="60"/>
    <line x1="60" y1="140" x2="760" y2="140"/>
    <line x1="60" y1="220" x2="760" y2="220"/>
    <line x1="60" y1="300" x2="760" y2="300"/>
    <line x1="60" y1="380" x2="760" y2="380"/>
  </g>`;

function candle(
  x: number,
  open: number,
  close: number,
  high: number,
  low: number,
  scale: (p: number) => number,
  highlight = false
) {
  const bull = close >= open;
  const color = bull ? "#22c55e" : "#ef4444";
  const bodyTop = scale(Math.max(open, close));
  const bodyBottom = scale(Math.min(open, close));
  const bodyH = Math.max(bodyBottom - bodyTop, 3);
  const stroke = highlight ? "#38bdf8" : color;
  const sw = highlight ? 2.5 : 1.5;
  return `
    <line x1="${x}" y1="${scale(high)}" x2="${x}" y2="${scale(low)}" stroke="${color}" stroke-width="1.5"/>
    <rect x="${x - 14}" y="${bodyTop}" width="28" height="${bodyH}" fill="${color}" stroke="${stroke}" stroke-width="${sw}" rx="1"/>
  `;
}

function label(text: string, x: number, y: number, fill = "#94a3b8", size = 12) {
  return `<text x="${x}" y="${y}" fill="${fill}" font-family="system-ui,sans-serif" font-size="${size}">${text}</text>`;
}

function callout(
  x: number,
  y: number,
  w: number,
  lines: string[],
  color = "#38bdf8"
) {
  const h = 18 + lines.length * 16;
  const text = lines
    .map(
      (line, i) =>
        `<text x="${x + 10}" y="${y + 22 + i * 16}" fill="#e2e8f0" font-family="system-ui,sans-serif" font-size="11">${line}</text>`
    )
    .join("");
  return `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="#0f172a" stroke="${color}" stroke-width="1.2" opacity="0.95"/>
    ${text}
  `;
}

/** Price scale: higher price = lower y (top of chart = $62, bottom = $44) */
function makeScale(min: number, max: number) {
  const top = 50;
  const bottom = 390;
  return (price: number) =>
    bottom - ((price - min) / (max - min)) * (bottom - top);
}

export const RESISTANCE_ZONE_CHART = `${SVG_OPEN}
  ${BG}
  ${GRID}
  ${label("Weekly chart: resistance zone", 60, 32, "#e2e8f0", 14)}
  ${label("$48", 24, 168)}
  ${label("$46", 24, 248)}
  ${label("$44", 24, 328)}
  <rect x="60" y="155" width="700" height="36" fill="rgba(234,179,8,0.14)" stroke="#eab308" stroke-width="1" stroke-dasharray="4 3"/>
  ${label("Resistance zone", 620, 148, "#eab308", 11)}
  ${(() => {
    const s = makeScale(44, 50);
    const prices = [
      [120, 45.2, 46.8, 47.2, 44.8],
      [200, 46.5, 45.8, 47.5, 45.2],
      [280, 45.5, 46.2, 47.8, 45.0],
      [360, 46.8, 45.5, 48.0, 45.2],
      [440, 45.2, 46.0, 47.6, 44.9],
      [520, 46.5, 45.8, 48.1, 45.5],
      [640, 45.8, 46.5, 47.4, 45.2],
    ] as const;
    return prices
      .map(([x, o, c, h, l]) => candle(x, o, c, h, l, s))
      .join("");
  })()}
  ${callout(480, 280, 260, ["Price rejected here 3×", "Zone = prior supply", "Wait for weekly close above"])}
</svg>`;

export const BREAKOUT_CANDLE_CHART = `${SVG_OPEN}
  ${BG}
  ${GRID}
  ${label("Step 1: valid breakout candle", 60, 32, "#e2e8f0", 14)}
  <rect x="60" y="155" width="700" height="36" fill="rgba(234,179,8,0.14)" stroke="#eab308" stroke-width="1" stroke-dasharray="4 3"/>
  ${(() => {
    const s = makeScale(44, 54);
    const prices = [
      [120, 45.2, 46.8, 47.2, 44.8],
      [200, 46.5, 45.8, 47.5, 45.2],
      [280, 45.5, 46.2, 47.8, 45.0],
      [360, 46.8, 45.5, 48.0, 45.2],
      [440, 45.2, 46.0, 47.6, 44.9],
      [520, 46.5, 45.8, 48.1, 45.5],
      [640, 47.0, 51.5, 52.0, 46.8, true],
    ] as const;
    return prices
      .map(([x, o, c, h, l, hi]) => candle(x, o, c, h, l, s, !!hi))
      .join("");
  })()}
  ${callout(500, 90, 250, ["Strong green body", "Closes near high ($51.50)", "Closes clearly above zone", "Not just a upper wick"])}
  ${label("Breakout candle", 600, 118, "#38bdf8", 11)}
</svg>`;

export const ENTRY_TRIGGER_CHART = `${SVG_OPEN}
  ${BG}
  ${GRID}
  ${label("Step 2: entry trigger (next candle)", 60, 32, "#e2e8f0", 14)}
  <line x1="60" y1="175" x2="760" y2="175" stroke="#3b82f6" stroke-width="1.5" stroke-dasharray="6 4"/>
  ${label("Entry @ breakout high ($52.00)", 560, 168, "#3b82f6", 11)}
  ${(() => {
    const s = makeScale(44, 56);
    const prices = [
      [280, 45.5, 46.2, 47.8, 45.0],
      [360, 46.8, 45.5, 48.0, 45.2],
      [440, 45.2, 46.0, 47.6, 44.9],
      [520, 46.5, 45.8, 48.1, 45.5],
      [600, 47.0, 51.5, 52.0, 46.8, true],
      [680, 52.2, 53.8, 54.5, 51.8],
    ] as const;
    return prices
      .map(([x, o, c, h, l, hi]) => candle(x, o, c, h, l, s, !!hi))
      .join("");
  })()}
  <path d="M 680 120 L 710 100 L 710 130 Z" fill="#3b82f6"/>
  ${callout(420, 260, 280, ["Do NOT buy the breakout candle", "Next candle trades above $52.00 high", "Buy-stop triggers at breakout high"])}
</svg>`;

export const STOP_LOSS_CHART = `${SVG_OPEN}
  ${BG}
  ${GRID}
  ${label("Step 3: stop-loss placement", 60, 32, "#e2e8f0", 14)}
  <line x1="60" y1="285" x2="760" y2="285" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="6 4"/>
  ${label("SL @ pre-breakout low ($47.00)", 560, 278, "#ef4444", 11)}
  <rect x="60" y="155" width="700" height="36" fill="rgba(234,179,8,0.14)" stroke="#eab308" stroke-width="1" stroke-dasharray="4 3"/>
  ${(() => {
    const s = makeScale(44, 54);
    const prices = [
      [360, 46.8, 45.5, 48.0, 45.2],
      [440, 45.2, 46.0, 47.6, 44.9],
      [520, 46.5, 47.0, 48.1, 47.0],
      [600, 47.0, 51.5, 52.0, 46.8, true],
      [680, 52.2, 53.8, 54.5, 51.8],
    ] as const;
    return prices
      .map(([x, o, c, h, l, hi]) => candle(x, o, c, h, l, s, !!hi))
      .join("");
  })()}
  ${callout(420, 320, 300, ["SL = low of candle before breakout", "Old resistance → support", "Close below = failed breakout"])}
  ${label("Pre-breakout candle", 480, 310, "#94a3b8", 11)}
</svg>`;

export const TRADE_MANAGEMENT_CHART = `${SVG_OPEN}
  ${BG}
  ${GRID}
  ${label("Step 4: 1:2 R:R with scale-out", 60, 32, "#e2e8f0", 14)}
  <line x1="60" y1="175" x2="760" y2="175" stroke="#3b82f6" stroke-width="1.5" stroke-dasharray="6 4"/>
  ${label("Entry $52.00", 680, 168, "#3b82f6", 11)}
  <line x1="60" y1="285" x2="760" y2="285" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="6 4"/>
  ${label("Initial SL $47.00 (1R)", 660, 278, "#ef4444", 11)}
  <line x1="60" y1="175" x2="760" y2="175" stroke="#64748b" stroke-width="1" stroke-dasharray="3 5" opacity="0.7"/>
  ${label("Breakeven SL $52.00", 660, 182, "#64748b", 10)}
  <line x1="60" y1="115" x2="760" y2="115" stroke="#22c55e" stroke-width="1.5" stroke-dasharray="6 4"/>
  ${label("Target 2: 2R ($62.00)", 620, 108, "#22c55e", 11)}
  <line x1="60" y1="145" x2="760" y2="145" stroke="#22c55e" stroke-width="1.5" stroke-dasharray="6 4"/>
  ${label("Target 1: 1R ($57.00)", 620, 138, "#22c55e", 11)}
  ${(() => {
    const s = makeScale(44, 64);
    const prices = [
      [120, 46.5, 47.0, 48.1, 47.0],
      [220, 47.0, 51.5, 52.0, 46.8, true],
      [320, 52.2, 56.5, 57.2, 52.0],
      [420, 56.8, 58.5, 59.0, 56.0],
      [520, 58.5, 60.0, 61.5, 58.0],
      [620, 60.5, 62.0, 63.0, 60.0],
    ] as const;
    return prices
      .map(([x, o, c, h, l, hi]) => candle(x, o, c, h, l, s, !!hi))
      .join("");
  })()}
  ${callout(80, 330, 320, ["At 1R: close 50%, SL → entry", "At 2R: close remaining 50%", "Never hit 1R? Full exit at SL"])}
  ${label("R = $5/share", 80, 318, "#94a3b8", 10)}
</svg>`;
