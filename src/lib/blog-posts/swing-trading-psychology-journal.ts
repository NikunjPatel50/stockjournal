import type { BlogFaqItem, BlogPost } from "@/lib/blog-posts";

const PSYCHOLOGY_FAQS: BlogFaqItem[] = [
  {
    question: "What is revenge trading in swing trading?",
    answer:
      "Revenge trading is entering a new position to recover a recent loss — often larger, faster, and with weaker setup quality. It usually happens the same session or day after a stop-out. The goal shifts from following your edge to ‘getting back to even,’ which breaks risk rules and sizing discipline.",
  },
  {
    question: "How do I know if I am trading from FOMO?",
    answer:
      "FOMO trades feel urgent: you enter because price is already moving, skip your trigger, size up because others are profiting, or buy after a 5%+ extension with no planned stop under structure. If you cannot write one sentence explaining why the setup is valid right now — not yesterday — it is often FOMO.",
  },
  {
    question: "Should I tag emotions in my trading journal?",
    answer:
      "Yes. Simple tags like FOMO, followed plan, revenge, hope, and boredom make patterns visible in analytics over 20–30 trades. You do not need a paragraph on every trade — a tag plus one line on what triggered the decision is enough to spot habits.",
  },
  {
    question: "How long should I stop trading after a big loss?",
    answer:
      "Many swing traders use a cooldown: no new entries for the rest of the day after hitting a daily loss limit, or 24 hours after a loss larger than 2R. The break is not punishment — it resets decision quality before the next gap risk.",
  },
  {
    question: "Can psychology problems show up in win rate?",
    answer:
      "Not always. FOMO can inflate win rate with small quick wins while large chase losses hide in avg R. Revenge trades often lose more per trade than winners gain. Track profit factor and avg R alongside tags — not win rate alone.",
  },
  {
    question: "What is hope trading?",
    answer:
      "Hope trading is holding past your stop level mentally, widening stops after entry, or avoiding exit because ‘it might come back.’ On active swings, hope shows up as refusing to mark a trade closed when your exit rule fired. Log the planned exit and compare it to what you actually did.",
  },
  {
    question: "How many trades do I need before tag analytics matter?",
    answer:
      "Start tagging immediately, but look for patterns after 15–20 closed trades with tags applied consistently. One tagged revenge trade is data; four in a month is a rule problem worth fixing with process, not willpower.",
  },
  {
    question: "Does SwingTradingLog support psychology tags?",
    answer:
      "Yes. Tag trades when you log or close them — setup type plus behavior tags like FOMO or followed plan. Use Analytics to see how tagged groups perform over time so psychology stops being a vague feeling and becomes measurable.",
  },
];

export const SWING_TRADING_PSYCHOLOGY_POST: BlogPost = {
  slug: "swing-trading-psychology-fomo-revenge-trades",
  title:
    "Swing Trading Psychology: How to Catch FOMO and Revenge Trades Before They Cost You",
  description:
    "Why emotional trades destroy edge, how to tag FOMO and revenge habits in your journal, cooldown rules that work, and a monthly review to turn psychology into data — not guilt.",
  publishedAt: "2026-08-06",
  readMinutes: 11,
  tags: ["Psychology", "Journal", "Discipline", "Swing trading"],
  coverImage: {
    src: "/blog/swing-trading-psychology-fomo-revenge-trades.jpg",
    alt: "Trader pausing before a decision with journal notes and charts on screen",
    credit: "Photo: SwingTradingLog",
  },
  faqs: PSYCHOLOGY_FAQS,
  seo: {
    metaTitle: "Swing Trading Psychology: FOMO & Revenge Trades",
    metaDescription:
      "Learn to spot FOMO, revenge, and hope trades in swing trading. Tag habits in your journal, use cooldown rules, and review psychology with data — free on SwingTradingLog.",
    keywords: [
      "swing trading psychology",
      "FOMO trading",
      "revenge trading",
      "trading journal tags",
      "trading discipline",
      "emotional trading",
      "hope trading",
    ],
    featuredImagePrompt:
      "Calm minimalist illustration of a trader at desk pausing with hand off keyboard, notebook with simple tags FOMO and PLAN, soft green and neutral tones, educational blog header 16:9, no broker logos.",
    internalLinks: [
      { label: "Start a Swing Trading Journal", path: "/blog/how-to-start-a-swing-trading-journal" },
      { label: "Weekly Review Framework", path: "/blog/weekly-swing-trade-review-without-overthinking" },
      { label: "Position Sizing Rules", path: "/blog/position-sizing-for-swing-traders" },
      { label: "Features", path: "/features" },
    ],
    externalReferences: [
      {
        label: "Van Tharp — Trading psychology resources",
        url: "https://www.vantharp.com/",
      },
      {
        label: "Investopedia — Behavioral finance overview",
        url: "https://www.investopedia.com/terms/b/behavioralfinance.asp",
      },
    ],
  },
  blocks: [
    {
      type: "p",
      text: "Your backtested setup can have a positive expectancy and still lose money — because the trades you take when frustrated are not the same as the trades you take when calm. Swing trading psychology is not about affirmations or ‘trading like a robot.’ It is about seeing emotional patterns early enough to enforce the rules you already wrote.",
    },
    {
      type: "p",
      text: "Most educational content covers stops, size, and screeners. Fewer guides address what happens after a gap against you, or when a ticker runs without your entry. This article is different: how FOMO, revenge trades, and hope show up in multi-day holds, how to tag them in a journal without drama, and how to review psychology the same way you review profit factor — with numbers, not shame.",
    },

    { type: "h2", text: "The three emotional trades that break swing systems" },
    {
      type: "p",
      text: "These labels are blunt on purpose. If you recognize them in your last month of trades, you are not failing — you are finally measuring something most traders ignore.",
    },
    {
      type: "table",
      caption: "Common emotional trade types in swing trading",
      headers: ["Label", "What it looks like", "Why it hurts swings"],
      rows: [
        [
          "FOMO",
          "Chasing after a 3–8% move, entering without trigger, sizing up late",
          "Bad R:R, stops under noise, overnight gap on extended names",
        ],
        [
          "Revenge",
          "New trade right after a loss, often bigger size, weaker setup",
          "Violates daily loss limits; correlated risk stacks fast",
        ],
        [
          "Hope",
          "Widening stop, ignoring exit signal, holding ‘until breakeven’",
          "Turns 1R loss into 3R; active notional stays elevated",
        ],
        [
          "Boredom",
          "Trading because the market is open, not because setup exists",
          "Low-quality entries dilute edge; fees compound",
        ],
      ],
    },

    { type: "h2", text: "Why swing traders feel emotions more than day traders" },
    {
      type: "p",
      text: "Multi-day holds add time for stories to grow. An intraday loss is over at the bell. A swing stop-out on Tuesday leaves Wednesday open — and your brain fills the gap with ‘I need to make it back.’ Overnight exposure also raises stakes: you are not just wrong on the chart, you are wrong while sleeping. That pressure pushes revenge entries before the next open.",
    },
    {
      type: "ul",
      items: [
        "Open P&L on active positions feeds anxiety when quotes refresh",
        "Social media highlights winners in names you skipped — classic FOMO fuel",
        "Weekends after a red week invite ‘fresh start’ oversizing on Monday",
        "Earnings within your hold window add binary outcomes you cannot control",
      ],
    },

    {
      type: "image",
      src: "/blog/swing-trading-psychology-fomo-revenge-trades.jpg",
      alt: "Trader reviewing journal tags for emotional trading patterns",
      caption: "Tag the decision, not your worth as a trader — patterns become fixable.",
    },

    { type: "h2", text: "Tag trades at entry, not only after a loss" },
    {
      type: "p",
      text: "If you only journal psychology when you blow up, you train yourself to associate tags with failure. Tag every trade with one behavior label when you log it: followed plan, FOMO, forced setup, or uncertain. Setup tags (breakout, pullback) tell you what you traded; behavior tags tell you how you traded.",
    },
    {
      type: "checklist",
      title: "Minimum tags worth using",
      items: [
        "followed plan — entry matched written trigger and size rule",
        "FOMO — entered after extension or without trigger",
        "revenge — within 24h of a loss > 1R, intent to recover",
        "hope — held past exit rule or moved stop wider against you",
        "boredom — no A-grade setup; traded for activity",
      ],
    },
    {
      type: "p",
      text: "Add one optional note line: ‘Almost skipped — chased 4% late’ or ‘Sized correctly despite prior loss.’ Future you will thank present you during monthly review.",
    },

    { type: "h2", text: "Cooldown rules that actually get used" },
    {
      type: "p",
      text: "Willpower fails at 3 p.m. after a stop-out. Rules fail less when they are binary and pre-written. Pick one cooldown and log it in your goals or journal template.",
    },
    {
      type: "ul",
      items: [
        "Daily loss limit hit → no new entries until next session",
        "Two stopped trades same day → screen only, no orders",
        "Loss > 2R → 24-hour no-trade window (manage existing actives only)",
        "Three tagged FOMO trades in a week → next week half size on all entries",
      ],
    },
    {
      type: "h3",
      text: "The pre-market question",
    },
    {
      type: "p",
      text: "Before the open, ask: Am I trading today’s setups or yesterday’s P&L? If the answer is P&L, reduce size or sit out. SwingTradingLog’s active-trade view and daily P&L strip make open risk visible — use that number to ground the question, not to scoreboard chase.",
    },

    { type: "h2", text: "Monthly psychology review (15 minutes)" },
    {
      type: "p",
      text: "Once a month, filter closed trades and sort by tag. You are looking for frequency and P&L impact, not moral judgment.",
    },
    {
      type: "ul",
      items: [
        "Count trades per behavior tag — which label appears most?",
        "Compare net P&L and avg R for ‘followed plan’ vs FOMO/revenge",
        "Read notes on the three largest losses — same tag repeating?",
        "Pick one process fix for next month (cooldown, half size, no adds)",
      ],
    },
    {
      type: "p",
      text: "If FOMO trades show positive P&L but terrible avg R, you may be ‘winning’ small and losing big — the same profile as a sub-1:2 system. Fix execution before you celebrate win rate.",
    },

    { type: "h2", text: "From insight to one enforceable rule" },
    {
      type: "p",
      text: "Do not rewrite your entire strategy because of psychology data. Change one rule. Examples that work for swing traders:",
    },
    {
      type: "ul",
      items: [
        "No entries after +3% extension from prior close without new base",
        "Max one new trade per day after any stop-out",
        "Must write trigger sentence in notes field before Active status",
        "No adding to losers — ever — tag any add as automatic review",
      ],
    },
    {
      type: "h3",
      text: "Start with the next trade, not a perfect month",
    },
    {
      type: "p",
      text: "Log your next swing with stop, target, and one behavior tag. When you close it, ask whether the tag still fits. Over twenty trades, SwingTradingLog analytics show whether your edge lives in ‘followed plan’ trades — and how much FOMO and revenge cost you in rupees, not regret. Free to start; the habit is the product.",
    },

    { type: "faq", items: PSYCHOLOGY_FAQS },
  ],
};
