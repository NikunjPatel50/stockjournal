export type FaqItem = {
  question: string;
  answer: string;
};

export const LANDING_FAQS: FaqItem[] = [
  {
    question: "What do I get when I sign up?",
    answer:
      "The same app as swingtradinglog.com: Dashboard (KPIs, charts, overnight exposure), Journal, Goals, Settings, and Feedback. Full access is free during beta, no credit card.",
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
      "SwingTradingLog works in a mobile browser today. Native iOS and Android apps are planned after beta (see Roadmap). Desktop sign-in gives you the full experience now.",
  },
  {
    question: "Where are Privacy and Terms?",
    answer:
      "In the site footer: Privacy Policy and Terms of Service. They cover accounts, optional trade sharing, and feedback submissions.",
  },
];
