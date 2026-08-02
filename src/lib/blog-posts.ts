export type BlogBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: string[] };

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  readMinutes: number;
  tags: string[];
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
];

// Fix the first post - I used type "ol" but BlogBlock only has ul. Let me fix in the file - use ul for the weekly review steps in post 1.

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug);
}

export function getAllBlogSlugs(): string[] {
  return BLOG_POSTS.map((post) => post.slug);
}
