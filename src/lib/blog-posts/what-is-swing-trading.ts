import type { BlogFaqItem, BlogPost } from "@/lib/blog-posts";

const SWING_TRADING_FAQS: BlogFaqItem[] = [
  {
    question: "What is swing trading?",
    answer:
      "Swing trading is a style where you hold positions for several days to a few weeks, aiming to capture a move between support and resistance. You are not scalping every tick like intraday trading, and you are not buying for years like investing. Swing traders use charts, catalysts, and risk rules to plan entries, stops, and targets before the trade.",
  },
  {
    question: "What is the difference between day trading and swing trading?",
    answer:
      "Day trading closes positions before the session ends; swing trading holds overnight or across weekends. Day traders focus on intraday volatility and often use margin for same-day turnover. Swing traders accept overnight gap risk in exchange for larger moves and fewer decisions per week. Both need a journal; the review cadence differs.",
  },
  {
    question: "What are good stocks for swing trading?",
    answer:
      "Liquid names with clear trends, defined support and resistance, and enough daily range to justify the risk. Many swing traders filter for average volume, sector leadership, and setups that match their strategy (breakouts, pullbacks, earnings plays). A swing trading watchlist keeps candidates ranked before the open.",
  },
  {
    question: "Can you swing trade forex?",
    answer:
      "Yes. Swing trading forex uses the same workflow as equities: identify a pair, define entry and stop on the chart, size by risk, and hold for multi-day moves. Forex trades 24 hours on weekdays, so session timing and weekend gap rules differ from US stocks. Log each position in a forex trading journal with pip or notional risk.",
  },
  {
    question: "Does swing trading work for options?",
    answer:
      "Many traders swing options on underlying moves, using defined-risk spreads or long calls and puts with a planned exit date. Option trading adds theta and IV to the plan, so the journal should record strike, expiry, and whether the trade was directional or a hedge. Track planned vs actual exit separately from the stock chart.",
  },
];

export const WHAT_IS_SWING_TRADING_POST: BlogPost = {
  slug: "what-is-swing-trading",
  title: "What Is Swing Trading? Strategy, Stocks & Day Trading Compared",
  description:
    "What swing trading means, how it differs from day trading and intraday trading, stocks for swing trading, forex and options workflows, and why a trading journal matters.",
  publishedAt: "2026-08-17",
  readMinutes: 9,
  tags: ["Beginners", "Swing trading", "Strategy"],
  coverImage: {
    src: "/blog/what-is-swing-trading.jpg",
    alt: "Swing trader reviewing multi-day charts and a trading journal on screen",
    credit: "Photo: SwingTradingLog",
  },
  faqs: SWING_TRADING_FAQS,
  seo: {
    metaTitle:
      "What Is Swing Trading? Strategy, Stocks & vs Day Trading | SwingTradingLog",
    metaDescription:
      "Learn what swing trading is, swing trading strategy basics, stocks for swing trading, and how it compares to day trading, intraday trading, forex, and option trading. Free journal on SwingTradingLog.",
    keywords: [
      "what is swing trading",
      "swing trading strategy",
      "swing trading stocks",
      "stocks for swing trading",
      "day trading",
      "intraday trading",
      "swing trading forex",
      "forex trading",
      "option trading",
      "swing trade",
      "online trading",
      "trading journal",
    ],
    internalLinks: [
      {
        label: "Build a Swing Trading Watchlist",
        path: "/blog/how-to-build-swing-trading-watchlist",
      },
      {
        label: "Start a Swing Trading Journal",
        path: "/blog/how-to-start-a-swing-trading-journal",
      },
      { label: "Features", path: "/features" },
      { label: "Preview the app", path: "/preview" },
    ],
  },
  blocks: [
    {
      type: "p",
      text: "Search trends show millions of people asking what is trading, how day trading differs from swing trading, and which stocks fit a multi-day hold. If you are comparing styles before opening a trading account, this guide explains swing trading in plain language: what it is, a simple swing trading strategy framework, and how it relates to intraday trading, option trading, and forex trading.",
    },
    {
      type: "h2",
      text: "What is trading?",
    },
    {
      type: "p",
      text: "Trading means buying and selling financial instruments to profit from price movement, usually over hours to weeks, not decades. Online trading platforms and charting tools make execution fast; the hard part is repeating a process with defined risk. Whether you trade stocks, options, forex, or crypto, you need a plan for entry, exit, and position size, plus a record of what actually happened.",
    },
    {
      type: "h2",
      text: "What is swing trading?",
    },
    {
      type: "p",
      text: "Swing trading sits between day trading and long-term investing. You hold positions for days to weeks to capture a swing in price, often from a pullback into support or a breakout above resistance. A swing trade typically has a stop under structure and a target at the next level, with risk sized as a fraction of your trading account.",
    },
    {
      type: "ul",
      items: [
        "Hold time: usually 2 to 15 sessions, sometimes longer around earnings or trends",
        "Charts: daily and weekly timeframes; trading charts with moving averages or levels you trust",
        "Risk: overnight and weekend gap exposure is real; size accordingly",
        "Review: weekly P&L and setup tags beat scrolling social feeds after a red day",
      ],
    },
    {
      type: "h2",
      text: "Swing trading vs day trading vs intraday trading",
    },
    {
      type: "table",
      caption: "How popular trading styles compare",
      headers: ["Style", "Typical hold", "Session focus", "Journal cadence"],
      rows: [
        [
          "Intraday / day trading",
          "Minutes to hours; flat by close",
          "Opening range, scalps, momentum",
          "End-of-day trade log",
        ],
        [
          "Swing trading",
          "Days to weeks",
          "Daily chart setups, catalysts",
          "Weekly review + active position notes",
        ],
        [
          "Position / investing",
          "Months to years",
          "Fundamentals, allocation",
          "Quarterly or annual",
        ],
      ],
    },
    {
      type: "p",
      text: "Intraday trading and day trading demand fast decisions and strict daily loss limits. Swing trading allows fewer trades but requires patience through pullbacks and honest logging when you widen a stop. Neither style works without tracking results; a trading app that combines journal, dashboard, and P&L analytics saves time versus spreadsheets.",
    },
    {
      type: "h2",
      text: "Swing trading strategy basics",
    },
    {
      type: "p",
      text: "A swing trading strategy is a repeatable set of rules: which market you trade, what setup you take, how you size, and when you exit. Most strategies fall into breakouts, pullbacks in trends, mean reversion, or event-driven plays. The edge is not the indicator alone; it is executing the same rules when bored, scared, or greedy.",
    },
    {
      type: "checklist",
      title: "Minimum swing trading strategy checklist",
      items: [
        "Universe: e.g. US large caps, NSE liquid names, or major forex pairs",
        "Setup definition: written trigger, not a vague feeling",
        "Stop and target before entry; know R:R",
        "Max risk per trade and per day",
        "Journal every trade with tags for setup and mistakes",
      ],
    },
    {
      type: "h2",
      text: "Stocks for swing trading",
    },
    {
      type: "p",
      text: "The best swing trading stocks for your book depend on liquidity, volatility, and whether you trade breakouts or pullbacks. Many traders build a swing trading watchlist of 15 to 30 names, rank setups nightly, and only trade the top two or three the next session. Stock trading journals help you see which sectors and tickers actually pay you over 30 or more closed trades.",
    },
    {
      type: "h2",
      text: "Forex, options, and gold trading",
    },
    {
      type: "p",
      text: "Swing trading forex uses the same journal fields as equities: pair, direction, entry, stop, target, and notes. Option trading adds expiry and structure (spread vs naked). Gold trading and other commodities often swing on macro headlines; log the thesis so you can review whether you traded the chart or the narrative. SwingTradingLog supports equities, options, forex, and crypto in one online trading journal.",
    },
    {
      type: "h2",
      text: "Paper trading and your first real journal",
    },
    {
      type: "p",
      text: "Paper trading lets you practice entries and exits without capital at risk. The gap appears when you go live: slippage, hesitation, and sizing drift. Treat paper trades like real ones in your journal for a few weeks, then continue the same log when you fund a trading account. Consistency beats switching tools every month.",
    },
    {
      type: "h2",
      text: "Track swing trades with SwingTradingLog",
    },
    {
      type: "p",
      text: "SwingTradingLog is a free trading journal and trading app for multi-day holds: log trades in under two minutes, attach trading chart screenshots, see overnight exposure on the dashboard, and review analytics without exporting CSVs. Whether you are learning what is swing trading or refining a mature swing trading strategy, start with a journal that matches how you actually trade.",
    },
  ],
};
