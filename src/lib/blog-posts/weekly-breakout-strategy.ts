import type { BlogFaqItem, BlogPost } from "@/lib/blog-posts";
import {
  BREAKOUT_CANDLE_CHART,
  ENTRY_TRIGGER_CHART,
  RESISTANCE_ZONE_CHART,
  STOP_LOSS_CHART,
  TRADE_MANAGEMENT_CHART,
} from "@/lib/blog-posts/weekly-breakout-chart-svgs";

const BREAKOUT_FAQS: BlogFaqItem[] = [
  {
    question: "Why use the weekly chart for breakout trades?",
    answer:
      "Weekly candles filter intraday noise and earnings gaps that fake out daily breakouts. A weekly close above resistance shows institutional-scale acceptance of higher prices, not a one-hour spike. You hold fewer, higher-conviction setups and review once per week instead of every session.",
  },
  {
    question: "Can I enter on the breakout candle itself?",
    answer:
      "Not in this system. The breakout candle confirms the level broke, but many fail the following week. Waiting for the next candle to trade above the breakout high proves follow-through before you commit capital. You give up a little entry price for a cleaner signal.",
  },
  {
    question: "Where exactly do I place the stop-loss?",
    answer:
      "At the low of the weekly candle immediately before the breakout candle, the last bar still inside or just below the resistance zone. If price closes back below that low, the breakout structure failed and old supply is still in control.",
  },
  {
    question: "What does scale-out at 1:1 mean?",
    answer:
      "When price reaches your first target (entry plus one unit of risk), you sell half the position and move the stop on the remaining half to breakeven (entry price). You bank partial profit, eliminate downside on the runner, and still participate if the trend reaches the 1:2 target.",
  },
  {
    question: "How do I size a weekly breakout trade?",
    answer:
      "Risk a fixed percentage of account equity per trade (often 0.5–1%). Position size = (account × risk %) ÷ (entry − stop). Example: $25,000 account, 1% risk ($250), $5 risk per share → 50 shares max. Log the planned R and actual exit in your journal.",
  },
];

export const WEEKLY_BREAKOUT_STRATEGY_POST: BlogPost = {
  slug: "weekly-breakout-swing-trading-strategy",
  title:
    "Weekly Timeframe Breakout Strategy: How to Enter and Exit Swing Trades Like a Pro",
  description:
    "A rules-based weekly breakout strategy for swing traders: resistance zones, breakout confirmation, buy-stop entry, stop-loss placement, and 1:2 R:R scale-out at 1R and 2R.",
  publishedAt: "2026-08-22",
  readMinutes: 16,
  tags: ["Strategy", "Breakouts", "Swing trading", "Risk management"],
  coverImage: {
    src: "/blog/weekly-breakout-swing-trading-strategy.jpg",
    alt: "Weekly candlestick chart showing a resistance breakout with entry, stop-loss, and profit targets marked",
    credit: "Illustration: SwingTradingLog",
  },
  faqs: BREAKOUT_FAQS,
  seo: {
    metaTitle:
      "Weekly Breakout Swing Trading Strategy: Entry, Stop-Loss & 1:2 Exit Rules",
    metaDescription:
      "Weekly breakout strategy for swing traders: entry, stop-loss, and 1:2 exit rules with scale-out. Rules-based swing trading entry and exit system.",
    keywords: [
      "weekly breakout strategy",
      "swing trading entry and exit rules",
      "weekly timeframe breakout",
      "resistance breakout swing trading",
      "1:2 risk reward",
      "swing trading strategy",
      "breakout trading strategy",
      "swing trade stop loss",
    ],
    internalLinks: [
      {
        label: "Risk Reward Ratio Guide",
        path: "/blog/risk-reward-ratio-swing-trading-guide",
      },
      {
        label: "Position Sizing for Swing Traders",
        path: "/blog/position-sizing-for-swing-traders",
      },
      {
        label: "Start a Swing Trading Journal",
        path: "/blog/how-to-start-a-swing-trading-journal",
      },
      { label: "Risk Calculator", path: "/risk-calculator" },
    ],
  },
  blocks: [
    {
      type: "p",
      text: "Most breakout trades fail because the entry was a guess and the exit was a hope. Intraday spikes through resistance reverse by Friday; daily charts whipsaw on news. The weekly timeframe cuts that noise: one candle per week, one decision per setup, and enough room for a multi-week swing to develop.",
    },
    {
      type: "p",
      text: "This article teaches a repeatable weekly breakout system, not a vague “buy strength” idea. You will learn exactly where the resistance zone is, what makes a breakout candle valid, when to enter (and when not to), where the stop goes, and how to scale out at 1:1 and 1:2 without moving targets emotionally mid-trade.",
    },
    {
      type: "p",
      text: "The rules below are fixed on purpose. When you journal each setup with the same checklist, you can review whether the edge is the strategy or your execution, not whether you “felt” bullish on a random green candle.",
    },
    {
      type: "h2",
      text: "What is a resistance zone?",
    },
    {
      type: "p",
      text: "A resistance zone is a horizontal band where price repeatedly stalled and sold off, prior highs, supply from older shareholders, or a level the market tested two or more times without closing above it. On a weekly chart, draw the zone from the cluster of rejection wicks and bodies, not a single tick-perfect line.",
    },
    {
      type: "ul",
      items: [
        "Look for 2–3+ rejections at similar prices over several weeks or months",
        "Use a zone, not a hairline, markets rarely respect one exact penny",
        "Weekly close matters, a wick through the zone that fails by Friday is not a breakout",
        "Volume should expand on the eventual breakout week when possible (confirmation, not a hard filter)",
      ],
    },
    {
      type: "svg",
      markup: RESISTANCE_ZONE_CHART,
      alt: "Weekly candlestick chart with a shaded horizontal resistance zone where price rejected three times before breaking out",
      caption:
        "Figure 1: A resistance zone built from prior weekly rejections. Wait for a decisive close above the band.",
    },
    {
      type: "h2",
      text: "Step 1: Identifying the breakout candle",
    },
    {
      type: "p",
      text: "A valid breakout candle is a weekly bar that closes above the resistance zone with conviction. It is not enough to poke above the level intraday and fade, the weekly close is your confirmation that buyers held control for the full week.",
    },
    {
      type: "h3",
      text: "What makes a breakout candle valid",
    },
    {
      type: "ul",
      items: [
        "Closes clearly above the zone, body finish above the band, not just an upper wick",
        "Closes near the weekly high, strong body (small upper wick relative to range)",
        "Decent range expansion, the bar is noticeably larger than recent inside weeks",
        "Volume above average (when available), participation supports the move",
      ],
    },
    {
      type: "svg",
      markup: BREAKOUT_CANDLE_CHART,
      alt: "Weekly chart highlighting a strong green breakout candle closing above the resistance zone near its high",
      caption:
        "Figure 2: Breakout candle outlined in blue. Do not enter here; this candle only confirms the break.",
    },
    {
      type: "h2",
      text: "Step 2: The entry trigger",
    },
    {
      type: "p",
      text: "Do not enter on the breakout candle itself. Many breakouts fail the very next week. Your entry rule adds one bar of follow-through:",
    },
    {
      type: "checklist",
      title: "Entry rule",
      items: [
        "Wait for the next weekly candle after the breakout candle",
        "Entry triggers when price trades above the high of the breakout candle",
        "Place a buy-stop order at the breakout candle high (your trigger level)",
        "If the next week never exceeds that high, there is no trade, pass and watch",
      ],
    },
    {
      type: "svg",
      markup: ENTRY_TRIGGER_CHART,
      alt: "Weekly chart showing the candle after the breakout trading above the breakout candle high with a dashed blue entry line",
      caption:
        "Figure 3: Entry fires when the following candle exceeds the breakout high ($52.00 in this example).",
    },
    {
      type: "h2",
      text: "Step 3: Setting the stop-loss",
    },
    {
      type: "p",
      text: "Place the stop-loss (SL) at the low of the candle immediately before the breakout candle, the last weekly bar still inside or just below the resistance zone. That candle represents the final point where sellers defended the level; if price falls back through its low, the breakout has likely failed.",
    },
    {
      type: "ul",
      items: [
        "Why not the breakout candle low?, Too tight; normal pullbacks stop you out of valid trends",
        "Why not below the whole zone?, Often correct on lower timeframes, but this system uses the pre-breakout bar for a defined, chart-based 1R",
        "Use a weekly close below SL as your structural invalidation, intraday spikes may wick; respect your plan",
      ],
    },
    {
      type: "svg",
      markup: STOP_LOSS_CHART,
      alt: "Weekly chart with red dashed stop-loss line at the low of the pre-breakout candle below the resistance zone",
      caption:
        "Figure 4: SL at the pre-breakout weekly low. A close below this level exits the full position for a controlled loss.",
    },
    {
      type: "h2",
      text: "Step 4: Trade management, 1:2 R:R with scale-out",
    },
    {
      type: "p",
      text: "Define R (one unit of risk) as entry price minus stop-loss price. All targets are multiples of R. This system uses a 1:2 reward-to-risk final target with a 50% scale-out at 1:1 and breakeven protection on the runner.",
    },
    {
      type: "table",
      caption: "Target formulas",
      headers: ["Level", "Formula", "Action"],
      rows: [
        ["Risk (R)", "Entry − Stop-loss", "Defines position size"],
        ["Target 1 (1:1)", "Entry + (1 × R)", "Close 50%; move SL to entry (breakeven)"],
        ["Target 2 (1:2)", "Entry + (2 × R)", "Close remaining 50%, trade complete"],
        ["Stop hit (no T1)", "Price reaches initial SL", "Exit 100% for −1R loss"],
      ],
    },
    {
      type: "checklist",
      title: "Management sequence",
      items: [
        "Enter full size at the buy-stop (breakout high)",
        "At Target 1 (1:1): sell half, move stop on the rest to breakeven (entry price)",
        "At Target 2 (1:2): sell the remaining half",
        "If price never reaches 1:1 and hits the original SL, exit the full position for a −1R loss",
        "Do not move SL to breakeven before 1:1, you need room for normal weekly volatility",
      ],
    },
    {
      type: "svg",
      markup: TRADE_MANAGEMENT_CHART,
      alt: "Weekly chart with entry line, initial and breakeven stop-loss lines, and 1R and 2R profit targets showing scale-out plan",
      caption:
        "Figure 5: Full plan: entry, SL, 1R partial exit + breakeven SL, 2R final exit.",
    },
    {
      type: "h2",
      text: "Full worked example",
    },
    {
      type: "p",
      text: "Stock XYZ bases under a weekly resistance zone near $48. The pre-breakout candle (Week −1) has a low of $47.00. The breakout candle (Week 0) closes strong with a high of $52.00. Week +1 trades above $52, your buy-stop fills at $52.00. You buy 100 shares.",
    },
    {
      type: "table",
      caption: "XYZ weekly breakout, numbers",
      headers: ["Item", "Price", "Notes"],
      rows: [
        ["Entry (buy-stop)", "$52.00", "High of breakout candle"],
        ["Stop-loss", "$47.00", "Low of pre-breakout candle"],
        ["R (risk per share)", "$5.00", "$52.00 − $47.00"],
        ["Target 1 (1:1)", "$57.00", "$52.00 + $5.00"],
        ["Target 2 (1:2)", "$62.00", "$52.00 + $10.00"],
      ],
    },
    {
      type: "p",
      text: "Scenario A, both targets hit: At $57 you sell 50 shares for +$5 × 50 = +$250, move SL to $52 on the rest. At $62 you sell 50 shares for +$10 × 50 = +$500. Total +$750 before fees.",
    },
    {
      type: "p",
      text: "Scenario B, stopped before 1:1: Price reverses to $47. Full 100 shares exit at SL: −$5 × 100 = −$500 (−1R on the planned risk). No breakeven move occurred because Target 1 never printed.",
    },
    {
      type: "p",
      text: "Log entry, SL, T1, T2, and whether you followed the scale-out rules in your journal. Compare planned R to realized R, see our /blog/risk-reward-ratio-swing-trading-guide for more on tracking R-multiples.",
    },
    {
      type: "h2",
      text: "Common mistakes",
    },
    {
      type: "ul",
      items: [
        "Entering on the breakout candle, you chase closes that fail next week; wait for the buy-stop trigger",
        "Stop too tight, using the breakout low instead of the pre-breakout low gets shaken out on healthy retests",
        "Moving SL to breakeven too early, before 1:1, normal noise stops you out of winners",
        "Moving SL too late after 1:1, if you hit 1:1, the rule is half off and breakeven on the rest; greed turns +1R into a give-back",
        "Ignoring the weekly close, a daily spike through resistance is not this setup; work the weekly chart only",
        "Oversizing, one −1R loss should not damage the account; use /blog/position-sizing-for-swing-traders",
      ],
    },
    {
      type: "h2",
      text: "Risk management and disclaimer",
    },
    {
      type: "p",
      text: "Size every trade so a full stop-loss costs only a small fraction of your account, commonly 0.5% to 1% of equity per position. With R = $5 per share and $250 max loss, you cap at 50 shares regardless of how confident you feel about the breakout.",
    },
    {
      type: "p",
      text: "Disclaimer: This article is for educational purposes only. It is not financial advice, a recommendation to buy or sell any security, or a guarantee of results. Past chart patterns do not predict future performance. Trading involves substantial risk of loss. Practice on paper or small size until you can execute the rules consistently, and consult a licensed professional for advice specific to your situation.",
    },
    {
      type: "h2",
      text: "Conclusion: journal the system",
    },
    {
      type: "p",
      text: "A weekly breakout edge comes from doing the same thing on every setup: mark the zone, confirm the candle, trigger on the next bar, place the SL on the pre-breakout low, scale at 1R, finish at 2R. Without a journal, you will not know if you skipped entries, moved stops, or exited early on winners.",
    },
    {
      type: "p",
      text: "Log each trade in SwingTradingLog with the breakout tag, attach a weekly chart screenshot, and review monthly whether 1:2 setups actually pay after slippage. Start with our /blog/how-to-start-a-swing-trading-journal, use the /risk-calculator before every entry, and build your watchlist with /blog/how-to-build-swing-trading-watchlist so you are ready when the next weekly close confirms.",
    },
  ],
};
