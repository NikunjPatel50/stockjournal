import type { BlogFaqItem, BlogPost } from "@/lib/blog-posts";

const WATCHLIST_FAQS: BlogFaqItem[] = [
  {
    question: "How many stocks should be on a swing trading watchlist?",
    answer:
      "Most swing traders work best with 15–40 names on a core weekly watchlist and 3–8 on a daily focus list. Fewer than 10 weekly names can mean missed opportunities; more than 50 usually means shallow research and reactive entries. Quality of review matters more than list length.",
  },
  {
    question: "What is the difference between a daily watchlist and a weekly watchlist?",
    answer:
      "A weekly watchlist is your researched universe of setups forming over days or weeks. A daily watchlist is the short list you actually monitor each session — names near trigger price, volume confirmation, or a breakout level. You promote stocks from weekly to daily; you do not scan the entire market every morning from scratch.",
  },
  {
    question: "How do I find stocks for swing trading?",
    answer:
      "Start with liquid leaders in strong sectors, then apply technical filters (volume, trend, relative strength, base patterns) and fundamental quality screens (sales growth, margins, manageable debt). Use screeners for discovery, charts for timing, and a journal to record which filters actually produce your best trades.",
  },
  {
    question: "Should beginners use fundamental or technical filters first?",
    answer:
      "Beginners should learn both at a basic level but prioritize technical timing and risk management. Fundamentals help you avoid weak businesses; technicals tell you when the market agrees. A simple combo: liquid stock, above 50-day EMA, RS improving, and no obvious balance-sheet red flags.",
  },
  {
    question: "What volume is good for swing trading?",
    answer:
      "There is no single number — context matters. Look for volume at least 1.5× the 20-day average on breakout or reversal days. For Indian large caps, many traders prefer average daily value traded above ₹5–10 crore; for US names, average volume above 500k–1M shares is a common starting point for liquid swings.",
  },
  {
    question: "What RSI level is best for swing trading entries?",
    answer:
      "RSI is not a magic buy signal. Pullback entries often appear when RSI resets to 40–50 in an uptrend. Breakout entries may occur with RSI 60–70 as strength confirms. Avoid buying solely because RSI is oversold in a downtrend — trend and structure matter more than one oscillator reading.",
  },
  {
    question: "How often should I update my swing trading watchlist?",
    answer:
      "Refresh the weekly list once per weekend with 30–60 minutes of screening and chart review. Update the daily list each pre-market or evening session in 10–15 minutes. Remove names that broke down, triggered and failed, or no longer meet your criteria — stale tickers create stale decisions.",
  },
  {
    question: "Can I swing trade only from a watchlist of ETFs and indices?",
    answer:
      "Yes. Many traders swing sector ETFs or broad indices with defined risk. ETFs simplify single-stock event risk but still gap overnight. Treat them like any other symbol: liquidity, trend, and position size rules still apply.",
  },
  {
    question: "What are the best stocks for swing trading?",
    answer:
      "The best stocks for you are liquid, trending, and match your setup rules — not whatever is trending on social media. Leaders with institutional sponsorship, clean bases, and volume on up days tend to repeat. Your journal will show which sectors and cap sizes actually pay you.",
  },
  {
    question: "Should I keep separate watchlists for long and short setups?",
    answer:
      "If you trade both sides, yes. Long and short setups have different market conditions (index trend, sector breadth). Mixing them on one list without labels causes confusion. Tag direction clearly and track performance separately in your journal.",
  },
  {
    question: "How do I avoid chasing stocks on my watchlist?",
    answer:
      "Define the entry trigger before the session: breakout level, pullback zone, or confirmation candle. If price runs 5%+ past your zone without you, skip it — add a secondary setup level or wait for the next base. Chasing is a process failure, not a missed opportunity.",
  },
  {
    question: "What tools do I need to build a stock watchlist?",
    answer:
      "At minimum: a screener (free or paid), a charting platform, and a place to store notes and triggers. SwingTradingLog adds trade logging and performance analytics so you can connect watchlist ideas to real outcomes — which setups deserve a permanent slot on your list.",
  },
  {
    question: "How does SwingTradingLog help with watchlists?",
    answer:
      "SwingTradingLog is built for swing traders who need journal discipline, not another screener. Log planned entries from your watchlist with stop and target defined, tag the setup type, and review analytics by strategy and session. Over time you see which watchlist criteria produce profit — and which ones only look good on Sunday scans.",
  },
];

export const SWING_TRADING_WATCHLIST_POST: BlogPost = {
  slug: "how-to-build-swing-trading-watchlist",
  title: "How to Build the Perfect Swing Trading Watchlist (Step-by-Step)",
  description:
    "A step-by-step guide to building a swing trading watchlist: daily and weekly routines, technical and fundamental filters, sample workflows, and common mistakes — so you trade fewer, better setups.",
  publishedAt: "2026-08-05",
  readMinutes: 16,
  tags: ["Watchlist", "Screening", "Swing trading", "Beginners"],
  coverImage: {
    src: "/blog/how-to-build-swing-trading-watchlist.jpg",
    alt: "Organized stock watchlist and candlestick charts on a trading desk",
    credit: "Photo: SwingTradingLog",
  },
  faqs: WATCHLIST_FAQS,
  seo: {
    metaTitle:
      "How to Build the Perfect Swing Trading Watchlist (Step-by-Step) | SwingTradingLog",
    metaDescription:
      "Learn how to build a swing trading watchlist with daily and weekly routines, technical and fundamental filters, and a repeatable workflow. Free journal tracking with SwingTradingLog.",
    keywords: [
      "swing trading watchlist",
      "watchlist for swing trading",
      "stock watchlist",
      "how to find swing trading stocks",
      "best stocks for swing trading",
      "daily watchlist",
      "weekly watchlist",
    ],
    featuredImagePrompt:
      "Professional editorial photo of a swing trader's dual-monitor setup: one screen shows a clean organized stock watchlist table, the other shows candlestick charts with moving averages. Warm desk lighting, shallow depth of field, modern minimalist home office, no visible brand logos, 16:9 composition, realistic photography style.",
    internalLinks: [
      { label: "How to Start a Swing Trading Journal", path: "/blog/how-to-start-a-swing-trading-journal" },
      { label: "Weekly Swing Trade Review", path: "/blog/weekly-swing-trade-review-without-overthinking" },
      { label: "Position Sizing for Swing Traders", path: "/blog/position-sizing-for-swing-traders" },
      { label: "Overnight Gap Risk", path: "/blog/overnight-gap-risk-for-swing-traders" },
      { label: "Risk Calculator", path: "/risk-calculator" },
      { label: "Trading Guides", path: "/trading-guides" },
    ],
    externalReferences: [
      { label: "Investopedia — Relative Strength Index (RSI)", url: "https://www.investopedia.com/terms/r/rsi.asp" },
      { label: "Investopedia — Exponential Moving Average (EMA)", url: "https://www.investopedia.com/terms/e/ema.asp" },
      { label: "SEC — Investor.gov introduction to investing", url: "https://www.investor.gov/introduction-investing" },
      { label: "NSE India — Market data", url: "https://www.nseindia.com/market-data" },
    ],
  },
  blocks: [
    {
      type: "p",
      text: "Every winning swing trader you admire has one thing in common that rarely makes it onto Twitter: a disciplined swing trading watchlist. Not a random bag of tickers from last night's scan, not fifty symbols you'll forget by Tuesday — a curated, ranked list of stocks that match your setup, your timeframe, and your risk rules. This guide walks you through building that watchlist from scratch, step by step, whether you trade Indian equities, US stocks, or both.",
    },
    {
      type: "p",
      text: "If you are new to swing trading, think of a watchlist as your shortlist before the shortlist. The market offers thousands of symbols. You will trade maybe five to fifteen setups in a good month. The watchlist is the bridge between market noise and actual orders. Get it right and your week feels calm: you know what to watch, what would invalidate the idea, and what “good enough to trade” looks like. Get it wrong and you chase, overtrade, and wonder why every chart “looked great” in hindsight.",
    },
    {
      type: "p",
      text: "We will cover why watchlists matter, what makes a stock worth watching, daily and weekly routines, technical and fundamental filters, a full sample workflow, mistakes to avoid, and how to connect your watchlist to real performance tracking in SwingTradingLog. Bring a notebook — or open a free journal — and build alongside the examples.",
    },

    { type: "h2", text: "Why Every Swing Trader Needs a Watchlist" },
    {
      type: "p",
      text: "Swing trading sits between day trading and investing. You hold positions for days to weeks, which means you cannot react to every tick — but you also cannot afford to discover a stock only after it has already moved 12%. A watchlist for swing trading solves three problems at once: attention, preparation, and accountability.",
    },
    {
      type: "ul",
      items: [
        "Attention — You decide in advance which symbols deserve mental bandwidth.",
        "Preparation — You define entry zones, stops, and catalysts before the market opens.",
        "Accountability — You can review whether your list produced trades or just anxiety.",
      ],
    },
    {
      type: "p",
      text: "Without a stock watchlist, screening becomes browsing. You flip through charts until something “looks ready,” enter late, and size emotionally. With a list, you trade your plan. The plan can still be wrong — but wrong plans are fixable. Random entries are not.",
    },
    {
      type: "p",
      text: "Professional desks run watchlists by sector, catalyst date, and liquidity tier. Retail swing traders should do the same at a smaller scale. Your edge is not scanning more; it is knowing deeply the names on your list when volume expands or a base completes.",
    },

    { type: "h2", text: "Characteristics of Good Swing Trading Stocks" },
    {
      type: "p",
      text: "Not every trending stock belongs on your list. The best stocks for swing trading — for your account size and style — share traits that make risk definable and exits manageable. Use the table below as a starting checklist before you add a ticker.",
    },
    {
      type: "table",
      caption: "Core traits of swing-friendly stocks (adjust thresholds for your market).",
      headers: ["Trait", "What to look for", "Why it matters"],
      rows: [
        [
          "Liquidity",
          "Tight spreads, consistent volume, fills near quoted price",
          "You can exit when wrong without slippage destroying R",
        ],
        [
          "Trend or base",
          "Clear uptrend, constructive base, or defined reversal zone",
          "Gives structure for stop placement",
        ],
        [
          "Volatility fit",
          "Daily range matches your stop distance and account risk",
          "Avoid names too quiet (no follow-through) or too wild (stops gapped)",
        ],
        [
          "Catalyst awareness",
          "Earnings, policy, or sector news you can calendar",
          "Swing holds cross overnight — surprises hurt",
        ],
        [
          "Correlation",
          "Not five identical bets unless intentional",
          "One sector shock should not wipe the week",
        ],
      ],
    },
    {
      type: "p",
      text: "Example: A trader with a ₹8 lakh account trading Indian equities might prefer Nifty 500 names with average daily traded value above ₹10 crore, price above ₹100, and a base forming under a prior high. A US-focused trader might filter for NASDAQ or NYSE stocks above $10 with average volume above 750k shares. The numbers differ; the logic does not.",
    },
    {
      type: "p",
      text: "Leaders — stocks outperforming their sector and the index — often produce the cleanest swing setups. Laggards can work for mean-reversion strategies, but only if that is your explicit edge. Do not mix leader breakouts and deep value catches on one list without tagging them differently.",
    },

    { type: "h2", text: "Daily Watchlist Routine" },
    {
      type: "p",
      text: "Your daily watchlist is the execution layer. It should take 10–20 minutes, not two hours. You are not rebuilding the universe; you are promoting names from the weekly list that are near trigger, showing volume, or reacting to news you already understood.",
    },
    {
      type: "checklist",
      title: "Daily watchlist routine (pre-market or prior evening)",
      items: [
        "Open the weekly list — remove names that broke down or triggered already",
        "Mark today's focus tier: A (ready), B (watch), C (background)",
        "Note exact entry trigger, stop, and target for each A-tier name",
        "Check index and sector trend — adjust size or skip if headwinds",
        "Scan headlines only for A-tier symbols (earnings, upgrades, gaps)",
        "Set price alerts at entry and stop levels — do not stare at charts all day",
        "Log any trade taken with setup tag and planned risk in your journal",
      ],
    },
    {
      type: "p",
      text: "Actionable example: Monday evening you see Stock X closing near a 8-week base pivot at ₹420 with volume 1.6× average. You add it to Tuesday's A-tier daily watchlist with entry ₹421–423, stop ₹408, target ₹445. Tuesday opens flat; you wait. At 10:15 volume expands and price clears ₹421 — you enter per plan. If it never triggers, you do nothing. The discipline is in the non-trade.",
    },
    {
      type: "p",
      text: "Keep the daily list small. Three to eight names is enough for most part-time swing traders. If everything on your screen looks “almost ready,” your weekly research was too loose — tighten filters upstream.",
    },

    { type: "h2", text: "Weekly Watchlist Routine" },
    {
      type: "p",
      text: "The weekly watchlist is where you answer how to find swing trading stocks systematically. Block 45–90 minutes once per weekend — Sunday evening works well for Indian markets opening Monday; US traders often scan Sunday for the week ahead.",
    },
    {
      type: "checklist",
      title: "Weekly watchlist rebuild",
      items: [
        "Review last week's trades: which watchlist setups worked or failed?",
        "Run screeners for trend, volume, and relative strength (see filters below)",
        "Open charts only for screener output — reject messy patterns fast",
        "Add 10–25 candidates with one-line thesis and setup type tag",
        "Rank by proximity to trigger and quality of base or pullback",
        "Cross-check earnings and event dates for the next two weeks",
        "Archive last week's list with brief notes — build a personal pattern library",
      ],
    },
    {
      type: "p",
      text: "Pair this with a weekly review of closed trades. Our guide on weekly swing trade review walks through a 20-minute framework so you do not overthink attribution. The watchlist and the journal feed each other: screeners suggest names; the journal tells you which screens deserve repeat use.",
    },
    {
      type: "table",
      caption: "Daily vs weekly watchlist — roles and time budget.",
      headers: ["Layer", "Purpose", "Typical size", "Time"],
      rows: [
        ["Weekly", "Research universe, setups forming", "15–40 symbols", "45–90 min/week"],
        ["Daily", "Execution focus, triggers near", "3–8 symbols", "10–20 min/day"],
        ["Active trades", "Positions with open risk", "2–6 positions", "5 min/day"],
      ],
    },

    { type: "h2", text: "Technical Filters" },
    {
      type: "p",
      text: "Technical filters turn a market of thousands into a stock watchlist worth charting. You do not need twelve indicators — you need a consistent stack that matches your setup. Below are the filters swing traders use most, with practical thresholds and examples.",
    },

    { type: "h3", text: "Volume" },
    {
      type: "p",
      text: "Volume confirms conviction. For breakout swings, look for up-days with volume at least 1.5× the 20-day average. Dry volume on rallies warns of weak hands. On pullbacks, declining volume into support suggests sellers exhausting. Compare volume relative to the stock's own history, not arbitrary share counts.",
    },
    {
      type: "p",
      text: "Example: Stock Y averages 2M shares/day. A breakout candle on 3.4M shares with a close in the top third of the range is more interesting than the same price move on 1.1M shares.",
    },

    { type: "h3", text: "RSI (Relative Strength Index)" },
    {
      type: "p",
      text: "RSI measures momentum on a 0–100 scale. In uptrends, pullbacks that reset RSI toward 40–50 often offer lower-risk entries than buying at 80. For momentum breakouts, RSI between 60 and 72 can confirm strength — but require price structure (higher highs, tight base) not just a hot oscillator. Avoid catching falling knives solely because RSI is below 30.",
    },

    { type: "h3", text: "EMA (Exponential Moving Average)" },
    {
      type: "p",
      text: "EMAs weight recent prices more than a simple moving average. A common swing stack: 9 EMA for short-term pullbacks, 21 EMA for swing trend, 50 EMA for intermediate bias. Many traders demand price above the 50-day EMA for long setups, or a reclaim of the 21 EMA after a constructive pullback. Align EMA rules with your hold period — a 3-day scalp and a 3-week swing use different averages.",
    },

    { type: "h3", text: "Relative Strength" },
    {
      type: "p",
      text: "Relative strength compares a stock's performance to a benchmark (Nifty 50, S&P 500, sector index). Leaders show RS line rising — making higher highs even when the index chops. Screen for stocks outperforming their sector over 1–3 months, then wait for a base near the highs. Buying laggards hoping they catch up is a different strategy; label it if you trade it.",
    },

    { type: "h3", text: "Breakouts" },
    {
      type: "p",
      text: "A breakout clears a defined resistance level — prior high, base pivot, or trendline — on expanded volume. Define the level before the session. Enter on confirmation (close above level, or opening range high in intraday confirmation styles), not on the first wick. Failed breakouts are common; your stop goes below the base or breakout candle low.",
    },

    { type: "h3", text: "VCP (Volatility Contraction Pattern)" },
    {
      type: "p",
      text: "VCP describes a series of tightening pullbacks with diminishing depth and often lower volume — sellers drying up before expansion. Each pullback might be 12%, then 8%, then 4%. The final contraction near the pivot is the watchlist sweet spot. Not every tight base is a textbook VCP; look for the spirit — decreasing volatility before a potential move.",
    },

    { type: "h3", text: "Cup & Handle" },
    {
      type: "p",
      text: "A cup and handle is a rounded base (cup) followed by a shallow pullback (handle) under prior highs. The handle should be orderly, not a violent dump. Entry is often above the handle high with stop below the handle low. These patterns take weeks to form — ideal for weekly watchlists, not panic Monday adds.",
    },

    { type: "h3", text: "Inside Bar" },
    {
      type: "p",
      text: "An inside bar forms when today's high-low range sits entirely within the prior day's range — compression. Swing traders use inside bars at support, at base pivots, or after pullbacks in trend. Trigger is a break above the mother bar high (long) or below the low (short). Combine with volume on the break to avoid false signals in range-bound names.",
    },
    {
      type: "table",
      caption: "Technical filter cheat sheet by setup type.",
      headers: ["Setup", "Key filters", "Invalidation"],
      rows: [
        ["Breakout", "Volume ≥1.5× avg, RS rising, clear pivot", "Close back inside base on volume"],
        ["Pullback", "Above 50 EMA, RSI 40–55 in uptrend", "Close below pullback low / EMA stack"],
        ["VCP / Cup", "Contracting swings, handle under highs", "Deep handle under 50% of cup depth"],
        ["Inside bar", "At support or pivot, mother bar defined", "Break of mother bar low (long)"],
      ],
    },

    { type: "h2", text: "Fundamental Filters" },
    {
      type: "p",
      text: "Technicals tell you when; fundamentals tell you whether the business can support a multi-day hold. You do not need an MBA — a handful of ratios filters out landmines that technical breakouts cannot fix.",
    },

    { type: "h3", text: "Sales Growth" },
    {
      type: "p",
      text: "Revenue growth shows demand. For swing candidates, look for positive year-over-year sales growth for at least the last few quarters — or acceleration in a turnaround you understand. Flat or shrinking sales with a hype chart is a trap many beginners buy. Growth alone is not enough, but stagnation is a yellow flag.",
    },

    { type: "h3", text: "ROCE (Return on Capital Employed)" },
    {
      type: "p",
      text: "ROCE measures how efficiently a company uses capital to generate profits. Consistently strong ROCE (industry-dependent, often 15%+ for quality Indian mid-caps as a rough benchmark) suggests a durable business. Compare peers in the same sector — a textile name and a software name will not share the same number.",
    },

    { type: "h3", text: "OPM (Operating Profit Margin)" },
    {
      type: "p",
      text: "Operating margin shows core profitability before interest and taxes. Expanding OPM with growing sales is ideal. Shrinking margins during a price rally can mean the market is ahead of fundamentals. For swing holds through earnings, know whether margin trend supports the narrative.",
    },

    { type: "h3", text: "Debt" },
    {
      type: "p",
      text: "High debt magnifies bad news. Check debt-to-equity and interest coverage. A leveraged company can gap down on a rate or refinancing headline regardless of your chart. Many swing traders exclude names above a personal D/E threshold (e.g. 1.0 for non-financials) unless trading a specific catalyst they have sized down.",
    },

    { type: "h3", text: "Promoter Holding" },
    {
      type: "p",
      text: "For Indian equities, promoter holding and pledge data matter. Stable or rising promoter stake signals alignment; heavy pledging raises forced-selling risk. Sudden promoter selling filings belong on your event calendar. US traders might substitute insider ownership and institutional ownership trends.",
    },
    {
      type: "table",
      caption: "Fundamental quick screen (customize per sector).",
      headers: ["Metric", "Favorable signal", "Caution"],
      rows: [
        ["Sales growth", "YoY positive, accelerating", "Multiple quarters of decline"],
        ["ROCE", "Above sector median, stable", "Falling ROCE while price rises"],
        ["OPM", "Expanding or stable high margin", "Compression + inventory build"],
        ["Debt", "Manageable D/E, good coverage", "Rising debt funding operating losses"],
        ["Promoter holding", "Stable/high, low pledge", "Pledge spike, repeated selling"],
      ],
    },

    { type: "h2", text: "Sample Watchlist Workflow" },
    {
      type: "p",
      text: "Theory becomes useful when you run it once end to end. Here is a complete example workflow you can copy this weekend.",
    },
    {
      type: "ul",
      items: [
        "Step 1 — Screener: Price above 50-day SMA, 3-month RS in top 30% of universe, avg volume above your liquidity floor.",
        "Step 2 — Chart pass: Keep only names with bases, pullbacks to rising 21 EMA, or fresh breakouts in last 5 sessions.",
        "Step 3 — Fundamental pass: Remove negative sales growth and D/E above your cap unless sector-normal (e.g. banks).",
        "Step 4 — Weekly list: 18 names with tags (breakout / pullback / VCP) and pivot prices written down.",
        "Step 5 — Daily cut: Monday A-tier = 5 names within 2% of pivot; set alerts.",
        "Step 6 — Execution: One entry at trigger; stop and target logged before submit.",
        "Step 7 — Review: Sunday — which tags had positive expectancy? Prune filters.",
      ],
    },
    {
      type: "p",
      text: "Concrete mini-example: After screening, you keep INFY (pullback to 21 EMA), RELIANCE (base breakout watch), and three mid-caps in renewable energy showing RS leadership. Earnings for RELIANCE are in nine days — you size smaller or move it to B-tier until clarity. INFY triggers Tuesday; you risk 1% of equity with stop below the EMA zone. You log the trade in SwingTradingLog with tag “pullback + RS leader” so analytics later show whether that combo works for you.",
    },

    { type: "h2", text: "Common Mistakes" },
    {
      type: "p",
      text: "Even solid filters fail when process breaks. These watchlist mistakes cost swing traders more than a bad pick now and then.",
    },
    {
      type: "ul",
      items: [
        "List bloat — 80 symbols means you recognize nothing deeply when it moves.",
        "No written trigger — “I'll know it when I see it” is how chasing starts.",
        "Ignoring correlation — five banking longs is one bet on rate sentiment.",
        "Stale names — tickers stay on the list weeks after the setup failed.",
        "Screener worship — passing a screen is not a trade; chart context is.",
        "Skipping earnings — gap risk destroys stops; calendar every A-tier name.",
        "Mixing timeframes — day-trade entries on a swing list without smaller stops.",
        "No feedback loop — never checking which watchlist tags actually make money.",
      ],
    },
    {
      type: "p",
      text: "Fix list bloat with a hard cap and a Sunday purge rule: if it has not triggered in three weeks and the structure broke, remove it. Fix the feedback loop with a journal — even a simple spreadsheet beats memory. SwingTradingLog automates the feedback by tying tags and outcomes to analytics so your next weekly scan is evidence-based.",
    },
    {
      type: "p",
      text: "Another subtle mistake: rebuilding the entire list every day because of FOMO. The daily watchlist should be a subset, not a panic reaction to pre-market movers you never researched. If a stock gaps 8% on news you did not anticipate, it was not on your process — let it go unless you have a defined secondary setup.",
    },

    { type: "h2", text: "Using SwingTradingLog to Track Watchlists and Trade Performance" },
    {
      type: "p",
      text: "A swing trading watchlist is only as good as the trades it produces. Tracking bridges the gap between “interesting chart” and “repeatable edge.” SwingTradingLog is a swing-focused journal — not a screener — built to log how watchlist ideas perform once you pull the trigger.",
    },
    {
      type: "ul",
      items: [
        "Log planned trades with entry, stop, and target before or at execution — planned risk stays visible.",
        "Tag each trade with setup type (breakout, pullback, VCP, earnings) matching your watchlist labels.",
        "Keep Active positions separate so overnight exposure and live P&L stay on the dashboard.",
        "Use Analytics to see win rate, profit factor, and session performance by your tags over time.",
        "Run weekly reviews in 20 minutes: filter closed trades, read losers first, adjust next week's screen.",
      ],
    },
    {
      type: "p",
      text: "Workflow tip: when you add a name to A-tier on Sunday, open a draft journal entry with ticker, thesis, stop, and target — even before you trade. If it triggers, you confirm and size. If it fails, you archive the note. That habit turns the watchlist into documented hypotheses instead of mental clutter.",
    },
    {
      type: "p",
      text: "Connect watchlist discipline to risk tools elsewhere on the site: use the risk calculator to translate stop distance into share count, read position sizing for swing traders before increasing size on your best setup tag, and review overnight gap risk before holding multiple names into a long weekend. Internal guides reinforce the same message — process over prediction.",
    },

    { type: "h2", text: "Conclusion" },
    {
      type: "p",
      text: "The perfect swing trading watchlist is not a static spreadsheet of hot tickers. It is a living system: weekly research to find swing trading stocks that match your rules, daily focus to execute without noise, technical and fundamental filters that fit your market, and honest review of what actually paid you. Start simple — one screener, three filters, a capped list — and add complexity only when data from your journal supports it.",
    },
    {
      type: "p",
      text: "This week, block time for your first weekly rebuild. Write triggers for five names. Trade only those triggers. Log every entry and skip with equal discipline. In a month, your stock watchlist will look nothing like a generic social media scan — it will look like your edge, documented and improving.",
    },
    {
      type: "checklist",
      title: "Quick start — build your first watchlist this weekend",
      items: [
        "Choose one market (NSE large cap, US mid cap, etc.) and one primary setup",
        "Set liquidity and trend filters in your screener",
        "Export 20–30 symbols; chart them in under 45 minutes",
        "Keep 15 names on the weekly list with pivot and stop levels noted",
        "Pick 3–5 A-tier names for Monday with alerts set",
        "Create a free SwingTradingLog account and log your next triggered trade",
      ],
    },

    { type: "h2", text: "Frequently Asked Questions" },
    {
      type: "p",
      text: "Below are answers to the most common questions about building and maintaining a watchlist for swing trading.",
    },
    { type: "faq", items: WATCHLIST_FAQS },

    {
      type: "image",
      src: "/blog/how-to-build-swing-trading-watchlist.jpg",
      alt: "Swing trader reviewing a structured stock watchlist beside candlestick charts",
      caption: "A focused watchlist plus a journal — fewer trades, clearer decisions.",
    },
  ],
};
