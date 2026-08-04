export type BlogBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "image"; src: string; alt: string; caption?: string };

export type BlogCoverImage = {
  src: string;
  alt: string;
  credit?: string;
};

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  readMinutes: number;
  tags: string[];
  coverImage: BlogCoverImage;
  blocks: BlogBlock[];
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "how-to-start-a-swing-trading-journal",
    title: "How to Start a Swing Trading Journal (Step-by-Step)",
    description:
      "A practical guide to logging swing trades, tracking P&L, and building review habits with a free journal workflow.",
    publishedAt: "2026-07-15",
    readMinutes: 8,
    tags: ["Journal", "Beginners", "Process"],
    coverImage: {
      src: "/blog/how-to-start-a-swing-trading-journal.jpg",
      alt: "Trader reviewing charts and notes at a desk",
      credit: "Photo: Pexels",
    },
    blocks: [
      {
        type: "p",
        text: "Most swing traders know they should journal. Fewer build a system they actually use after a losing week. The difference is not motivation — it is friction. A swing trading journal works when logging a trade takes less than two minutes and reviewing your week takes less than twenty.",
      },
      {
        type: "h2",
        text: "What belongs in a swing journal",
      },
      {
        type: "p",
        text: "You do not need a novel for every trade. You need enough structure to answer three questions later: Did I follow my plan? Was the risk defined before entry? What would I repeat or avoid?",
      },
      {
        type: "ul",
        items: [
          "Ticker, direction, and asset class (equity, option, forex, crypto)",
          "Entry and exit dates with prices, quantity, and fees",
          "Stop loss and profit target before you enter",
          "Strategy tag (breakout, pullback, earnings, etc.)",
          "One sentence on why you took the trade",
          "Outcome and P&L after the position is closed",
        ],
      },
      {
        type: "image",
        src: "/blog/how-to-start-a-swing-trading-journal.jpg",
        alt: "Notebook and laptop used for planning swing trades",
        caption: "A simple journal beats a perfect spreadsheet you never open.",
      },
      {
        type: "h2",
        text: "Log active trades separately from closed ones",
      },
      {
        type: "p",
        text: "Swing positions often stay open for days. Treat active trades as open risk, not finished stories. Mark them Active while you hold, then close them only when you exit. That keeps overnight exposure visible on your dashboard instead of hiding open risk inside a closed-trade average.",
      },
      {
        type: "h2",
        text: "A simple weekly review ritual",
      },
      {
        type: "ul",
        items: [
          "Filter the journal to trades closed this week.",
          "Note win rate, average R:R, and largest winner/loser.",
          "Read notes on losing trades first — patterns show up faster there.",
          "Pick one rule to enforce next week (max loss per trade, no adding to losers, etc.).",
        ],
      },
      {
        type: "h3",
        text: "Start today with one template",
      },
      {
        type: "p",
        text: "Open SwingTradingLog, log your next swing trade with stop and target filled in, and set a recurring Sunday reminder to review the week. Free forever, no credit card — the goal is consistency, not perfection on day one.",
      },
    ],
  },
  {
    slug: "overnight-gap-risk-for-swing-traders",
    title: "Overnight Gap Risk: What Swing Traders Should Track Before the Bell",
    description:
      "Why multi-day holds carry gap risk, how to size exposure, and what to monitor on open positions over weekends and holidays.",
    publishedAt: "2026-07-22",
    readMinutes: 7,
    tags: ["Risk", "Overnight", "Swing trading"],
    coverImage: {
      src: "/blog/overnight-gap-risk-for-swing-traders.jpg",
      alt: "Stock market candlestick chart on a monitor",
      credit: "Photo: Pexels",
    },
    blocks: [
      {
        type: "p",
        text: "Swing trading profits from moves that take more than one session. That same time horizon exposes you to gaps: prices that open above or below the prior close without you getting a fill in between. Earnings, macro headlines, and sector news all land while the market is closed.",
      },
      {
        type: "h2",
        text: "Notional exposure vs. planned risk",
      },
      {
        type: "p",
        text: "Planned risk is what you lose if your stop is hit. Overnight exposure is how much capital is tied up in open positions when you cannot react. A ₹2 lakh position with a tight stop still gaps through that stop on a bad open. Track both numbers.",
      },
      {
        type: "ul",
        items: [
          "Sum entry notional across all Active positions",
          "Flag positions held over Friday close into Monday",
          "Note earnings dates within your hold window",
          "Cap total overnight notional as a percent of account equity",
        ],
      },
      {
        type: "image",
        src: "/blog/overnight-gap-risk-for-swing-traders.jpg",
        alt: "Financial chart showing price movement between sessions",
        caption: "Gaps happen when the market reopens — plan for them before you hold overnight.",
      },
      {
        type: "h2",
        text: "Weekend and holiday risk is different",
      },
      {
        type: "p",
        text: "A two-day weekend is not just double an overnight hold. Liquidity is thinner at the open, and news stacks up. Many traders reduce size before long weekends or hedge index exposure when carrying multiple correlated names.",
      },
      {
        type: "h2",
        text: "Use gap risk in your pre-trade checklist",
      },
      {
        type: "p",
        text: "Before you enter, ask: If this gaps 3% against me at the open, am I still within daily loss limits? If not, size down or skip. SwingTradingLog surfaces overnight and weekend exposure on the dashboard so you see aggregate gap risk next to P&L, not buried in a spreadsheet.",
      },
      {
        type: "h3",
        text: "Practical rule of thumb",
      },
      {
        type: "p",
        text: "Keep total active notional under a fixed cap — for example 40% of equity for diversified swings, lower if names are correlated. Review the cap every Friday before the close. Discipline on exposure often matters more than picking one extra winner.",
      },
    ],
  },
  {
    slug: "weekly-swing-trade-review-without-overthinking",
    title: "How to Review Swing Trades Weekly (Without Overthinking)",
    description:
      "A 20-minute weekly review framework for swing traders: metrics that matter, journal prompts, and when to stop tweaking your system.",
    publishedAt: "2026-07-29",
    readMinutes: 9,
    tags: ["Review", "Analytics", "Habits"],
    coverImage: {
      src: "/blog/weekly-swing-trade-review-without-overthinking.jpg",
      alt: "Analytics dashboard with charts and performance metrics",
      credit: "Photo: Pexels",
    },
    blocks: [
      {
        type: "p",
        text: "Weekly reviews fail when they turn into hours of chart archaeology. The point is decision quality, not documentation for its own sake. A tight review answers whether your edge showed up this week and what to adjust next week — nothing more.",
      },
      {
        type: "h2",
        text: "The 20-minute review agenda",
      },
      {
        type: "ul",
        items: [
          "5 min — Dashboard: net P&L, profit factor, win rate for the period",
          "5 min — Journal: scan closed trades, sort by largest loss",
          "5 min — Goals: did you hit process targets (max trades, max loss)?",
          "5 min — One written takeaway and one rule for next week",
        ],
      },
      {
        type: "image",
        src: "/blog/weekly-swing-trade-review-without-overthinking.jpg",
        alt: "Laptop screen showing trading performance analytics",
        caption: "Focus on profit factor and R:R — not just win rate.",
      },
      {
        type: "h2",
        text: "Metrics worth tracking vs. noise",
      },
      {
        type: "p",
        text: "Win rate alone misleads if your winners are smaller than losers. Profit factor and average R:R tell you more about sustainability. Max drawdown for the month keeps you honest about streaks. Use period filters (this week, this month) instead of all-time numbers when reviewing recent behavior.",
      },
      {
        type: "h2",
        text: "Journal prompts that surface real mistakes",
      },
      {
        type: "ul",
        items: [
          "Did I enter before confirmation or chase after the move started?",
          "Was stop placement logical or arbitrary?",
          "Did I size correctly for overnight risk?",
          "Did I exit on plan or hope?",
        ],
      },
      {
        type: "p",
        text: "Tag trades with psychology labels (FOMO, followed plan, revenge trade) so tag-level analytics reveal habits over time.",
      },
      {
        type: "h2",
        text: "When to change your system",
      },
      {
        type: "p",
        text: "Do not rewrite your strategy after one bad week. Look for the same mistake three times in a month before changing rules. If the mistake is execution (late entries, moving stops), fix process. If setups genuinely stopped working in current volatility, adjust setup criteria — not everything at once.",
      },
      {
        type: "h3",
        text: "Make review non-optional",
      },
      {
        type: "p",
        text: "Block the same time each week. Export CSV backups monthly so your history survives platform changes. SwingTradingLog keeps journal, dashboard analytics, and goals in one place so the review stays short — sign in, filter the week, write one paragraph, done.",
      },
    ],
  },
  {
    slug: "position-sizing-for-swing-traders",
    title: "Position Sizing for Swing Traders: Rules That Survive Bad Weeks",
    description:
      "How to size swing trades as a percent of equity, cap daily loss, and keep one bad gap from wiping out a month of gains.",
    publishedAt: "2026-08-03",
    readMinutes: 8,
    tags: ["Risk", "Position sizing", "Swing trading"],
    coverImage: {
      src: "/blog/position-sizing-for-swing-traders.jpg",
      alt: "Trader planning position sizes with charts and notes at a desk",
      credit: "Photo: SwingTradingLog",
    },
    blocks: [
      {
        type: "p",
        text: "Most blown accounts are not bad stock picks — they are oversized positions. Swing traders hold through overnight gaps, so a single trade can move more than your planned stop on paper. Position sizing is how you stay in the game when the market opens against you.",
      },
      {
        type: "h2",
        text: "Start with risk per trade, not share count",
      },
      {
        type: "p",
        text: "Decide how much of your account you are willing to lose if the stop is hit — typically 0.5% to 2% per trade for most swing accounts. Then work backward from entry to stop distance. Quantity = risk amount ÷ (entry − stop) per share. Log that math before you enter so you are not guessing lot size at the open.",
      },
      {
        type: "ul",
        items: [
          "Set a fixed rupee or dollar risk per trade (e.g. ₹2,000 on a ₹5 lakh account = 0.4%)",
          "Never increase size after a win to “make more back”",
          "Reduce size when volatility expands (ATR widens, earnings week)",
          "Cap total open risk across all Active positions — not just one trade",
        ],
      },
      {
        type: "image",
        src: "/blog/position-sizing-for-swing-traders.jpg",
        alt: "Desk setup for planning swing trade position sizes",
        caption: "Size from stop distance and account risk — not from how confident you feel.",
      },
      {
        type: "h2",
        text: "Account equity vs. notional exposure",
      },
      {
        type: "p",
        text: "Planned risk is what you lose at your stop. Notional exposure is how much capital is tied up while the trade is open. A ₹3 lakh position with a ₹6,000 stop still gaps through that stop on a bad headline. Track both: risk per trade and sum of active notional as a percent of equity.",
      },
      {
        type: "h2",
        text: "Rules that compound over time",
      },
      {
        type: "ul",
        items: [
          "Daily loss limit: stop trading after −2R or −3% for the day",
          "Max concurrent positions: e.g. three swings unless setups are uncorrelated",
          "No adding to losers — size is fixed at entry",
          "Scale out partial profits; do not double size on the next trade",
        ],
      },
      {
        type: "h3",
        text: "Log size in your journal",
      },
      {
        type: "p",
        text: "Record quantity, stop, and target when you open the trade. SwingTradingLog shows overnight exposure and return on your starting balance so you see whether sizing drifted over the month — not just whether individual picks worked.",
      },
    ],
  },
  {
    slug: "stop-loss-placement-for-swing-trades",
    title: "Where to Place Stop Losses on Swing Trades (Without Getting Shaken Out)",
    description:
      "Structure-based stop placement for multi-day holds: swing lows, ATR buffers, and when to accept a wider stop with smaller size.",
    publishedAt: "2026-08-03",
    readMinutes: 7,
    tags: ["Stops", "Risk management", "Setup"],
    coverImage: {
      src: "/blog/stop-loss-placement-for-swing-trades.jpg",
      alt: "Candlestick chart with support level and stop loss zone marked",
      credit: "Photo: SwingTradingLog",
    },
    blocks: [
      {
        type: "p",
        text: "A stop too tight gets hit on normal noise. A stop too wide turns a small mistake into a large loss. Swing traders need stops that respect the chart structure of the setup — and position size that matches the distance to that level.",
      },
      {
        type: "h2",
        text: "Place stops where the thesis breaks",
      },
      {
        type: "p",
        text: "If you bought a pullback to support, the stop belongs below that support — not at an arbitrary 2% from entry. If you bought a breakout, the stop belongs below the breakout level or the last swing low that invalidates the pattern. The stop is a line in the sand: “If price is here, I was wrong.”",
      },
      {
        type: "ul",
        items: [
          "Long swings: below recent swing low or breakout base",
          "Short swings: above recent swing high or failed breakdown",
          "Add a small buffer beyond the level (wick room), not a huge cushion",
          "Avoid stops inside the average daily range with no structural reason",
        ],
      },
      {
        type: "image",
        src: "/blog/stop-loss-placement-for-swing-trades.jpg",
        alt: "Chart showing stop placement below a support level",
        caption: "Structure first — then size the trade to the distance to your stop.",
      },
      {
        type: "h2",
        text: "ATR and volatility buffers",
      },
      {
        type: "p",
        text: "On volatile names, a few ticks below support is not enough. Many traders use 0.5× to 1× ATR beyond the level as a buffer so a normal wick does not stop them out before the move. If that makes the stop too wide for your risk budget, size down — do not move the stop closer without a structural reason.",
      },
      {
        type: "h2",
        text: "Set the stop before entry — and do not move it",
      },
      {
        type: "p",
        text: "Log stop and target when the trade is Active. Moving a stop farther away after entry is hope, not risk management. Trailing stops are fine when price moves in your favor; widening against you is how small losses become account damage.",
      },
      {
        type: "h3",
        text: "Review stop quality in your journal",
      },
      {
        type: "p",
        text: "In weekly review, sort losers and ask: Was I stopped on noise or was the thesis wrong? If noise stops repeat on the same setup, widen the buffer or trade a cleaner timeframe. SwingTradingLog keeps stop and target on every active trade so you can audit placement without scrolling old charts.",
      },
    ],
  },
  {
    slug: "sector-and-market-cap-performance-for-swing-traders",
    title: "Sector and Market Cap Performance: What Your Swing Journal Should Show You",
    description:
      "How to break down swing trade P&L by sector and company size so you stop repeating the same mistakes in the wrong part of the market.",
    publishedAt: "2026-08-04",
    readMinutes: 8,
    tags: ["Analytics", "Attribution", "Swing trading"],
    coverImage: {
      src: "/blog/sector-and-market-cap-performance-for-swing-traders.jpg",
      alt: "Trading analytics dashboard showing sector and market cap performance breakdown",
      credit: "Photo: SwingTradingLog",
    },
    blocks: [
      {
        type: "p",
        text: "Most swing traders review trades one ticker at a time. That works for execution mistakes — late entries, moved stops, oversizing. It misses a bigger question: are you actually profitable in the parts of the market where you spend most of your time? Sector and market-cap attribution turns a pile of closed trades into a map of where your edge lives.",
      },
      {
        type: "h2",
        text: "Why sector breakdown matters for swing traders",
      },
      {
        type: "p",
        text: "Sectors do not move in lockstep. A pullback setup that works in defensives can fail in high-beta tech during the same week. If you trade NSE names in INR, banking, IT, and energy often behave differently through rate cycles and earnings seasons. Without grouping P&L by sector, you might keep trading a style that only worked because one sector was trending.",
      },
      {
        type: "ul",
        items: [
          "See which sectors contribute most of your net P&L over 30–90 days",
          "Spot win-rate gaps between sectors you trade equally often",
          "Notice when losses cluster in one theme (e.g. small-cap momentum)",
          "Align position size with sector volatility instead of using one fixed rule everywhere",
        ],
      },
      {
        type: "image",
        src: "/blog/sector-and-market-cap-performance-for-swing-traders.jpg",
        alt: "Analytics view with sector and market cap performance tables",
        caption: "Attribution by sector and size beats guessing which setups actually pay.",
      },
      {
        type: "h2",
        text: "Market cap: large, mid, small, and micro",
      },
      {
        type: "p",
        text: "Market cap changes how a stock trades — liquidity at the open, gap size, and how fast support breaks. Large caps on NSE often gap less but move slower; small caps can offer bigger swings with wider stops and more overnight risk. Breaking performance into large, mid, small, and micro buckets shows whether you are forcing the same hold time on names that need different rules.",
      },
      {
        type: "ul",
        items: [
          "Large cap: tighter spreads, cleaner levels — often better for newer swing systems",
          "Mid cap: balance of movement and liquidity; watch earnings and promoter news",
          "Small / micro cap: size down; gaps and slippage punish wide notional",
          "Compare avg R and win rate per bucket, not just total P&L",
        ],
      },
      {
        type: "h2",
        text: "What to look for each month",
      },
      {
        type: "p",
        text: "Run attribution after at least 15–20 closed equity trades so one lucky winner does not dominate. Sort groups by net P&L, then read the losers within the worst group. Ask: was the setup wrong for that sector, or was execution the problem? If IT shows a high win rate but negative P&L, your winners may be too small — a sizing issue, not a sector ban.",
      },
      {
        type: "h2",
        text: "Turn insight into rules",
      },
      {
        type: "ul",
        items: [
          "Cap concurrent positions in your weakest sector until stats improve",
          "Trade smaller in market-cap buckets with poor avg R",
          "Tag trades with strategy + sector context in your journal notes",
          "Re-check attribution quarterly — edges drift as volatility regimes change",
        ],
      },
      {
        type: "h3",
        text: "Log trades with enough structure to attribute later",
      },
      {
        type: "p",
        text: "You need closed trades with ticker, P&L, stop, and target logged consistently. SwingTradingLog groups realized results by sector and market cap on the Analytics page so you see which parts of the market fund your account — and which ones only feel active. Start logging the next swing with stop and target filled in; let the breakdown tell you where to focus next month.",
      },
    ],
  },
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug);
}

export function getAllBlogSlugs(): string[] {
  return BLOG_POSTS.map((post) => post.slug);
}
