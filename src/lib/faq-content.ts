export type FaqItem = {
  question: string;
  answer: string;
};

export const LANDING_FAQS: FaqItem[] = [
  {
    question: "Is there a trading journal PDF I can download?",
    answer:
      "SwingTradingLog is an online trading journal, not a static PDF template. You log trades in the app and export CSV from Settings → Data to open in Excel or print. Many traders start with a trading journal PDF or spreadsheet and switch once they need filters, charts, and live open-position P&L.",
  },
  {
    question: "What is the best free trading journal?",
    answer:
      "The best trading journal is one you review weekly: fast logging, active vs closed trades, analytics, and export. SwingTradingLog is a free trading journal app with dashboard KPIs, overnight gap risk, sector analytics, and CSV backup — no credit card and no paywalled core features.",
  },
  {
    question: "What is swing trading?",
    answer:
      "Swing trading means holding positions for several days to a few weeks to capture a price swing, usually on daily charts. It sits between intraday trading (flat by close) and long-term investing. SwingTradingLog is built for this style but also logs day trades, options, and forex in one journal.",
  },
  {
    question: "Is SwingTradingLog a trading app?",
    answer:
      "Yes. SwingTradingLog is a free web trading app for journaling and analytics: log trades, attach chart screenshots, review dashboard P&L, track overnight gap risk, and export data. It works in desktop and mobile browsers; native apps are on the roadmap.",
  },
  {
    question: "Can I log day trading and intraday trades?",
    answer:
      "Yes. While the product is optimized for swing holds, you can log any duration. Mark trades Active or Closed, record entry and exit times, and filter by strategy or tag. Many traders use it alongside a separate execution platform for stock trading and intraday sessions.",
  },
  {
    question: "Does it support option trading and forex trading?",
    answer:
      "Yes. Each trade supports equities, options, forex, and crypto with direction, quantity, stops, targets, fees, notes, and optional chart images. Option trades can record structure in notes; forex pairs use the same P&L and risk fields as stocks.",
  },
  {
    question: "What do I get when I sign up?",
    answer:
      "The same app as swingtradinglog.com: Dashboard (KPIs, charts, overnight exposure), Journal, Goals, Settings, and Feedback. Full access is free, no credit card.",
  },
  {
    question: "Which assets can I journal?",
    answer:
      "Equities, options, forex, and crypto. Each trade supports direction, strategy, tags, stops, targets, fees, notes, psychology tags, and an optional chart screenshot.",
  },
  {
    question: "Can I import or export my trades?",
    answer:
      "Yes. Export trades to CSV and download or restore a JSON workspace backup from Settings → Data. Smarter broker CSV import is still on the roadmap.",
  },
  {
    question: "How does overnight and weekend exposure work?",
    answer:
      "The Dashboard totals notional on open (active) positions and flags overnight, weekend, and holiday gap risk. Exposure uses entry price until live quotes are available.",
  },
  {
    question: "Can I share trades publicly?",
    answer:
      "For closed trades only. Create a branded PNG or copy a public share link from the Journal. You can disable sharing in Settings → Display.",
  },
  {
    question: "Is there a separate analytics product?",
    answer:
      "No. Performance analytics live on the Dashboard: period filters, KPI ribbon, equity curve, weekly P&L, monthly performance, and P&L breakdown.",
  },
  {
    question: "Is there a mobile app?",
    answer:
      "SwingTradingLog works in a mobile browser today. Native iOS and Android apps are on the roadmap. Desktop sign-in gives you the full experience now.",
  },
  {
    question: "Where are Privacy and Terms?",
    answer:
      "In the site footer: Privacy Policy and Terms of Service. They cover accounts, optional trade sharing, and feedback submissions.",
  },
];
