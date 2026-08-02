import { LANDING_FAQS } from "@/lib/faq-content";

export type ChatbotLink = {
  label: string;
  href: string;
};

export type ChatbotEntry = {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
  links?: ChatbotLink[];
};

export const CHATBOT_GREETING =
  "Hi! I’m the SwingTradingLog assistant. Pick a question below or type your own — I can answer from our site FAQ, pricing, and product pages.";

/** Free questions before email is required for follow-up. */
export const CHATBOT_QUESTION_LIMIT = 3;

export const CHATBOT_EMAIL_PROMPT =
  "Thanks for your questions! If you’re open to it, please share your email — it helps us improve SwingTradingLog and follow up if we can be more helpful.";

export const CHATBOT_EMAIL_HELPER =
  "Your email helps us improve the site and serve traders better. We won’t spam you.";

export const CHATBOT_EMAIL_THANKS =
  "Thank you — we appreciate it. You can keep asking questions here, or sign in free to explore the journal.";

export const CHATBOT_EMAIL_STORAGE_KEY = "swingtradinglog_chatbot_email";

export const CHATBOT_FALLBACK =
  "I’m not sure about that yet. Try one of the suggested questions, browse the FAQ on the homepage, or sign in free to explore the journal.";

const EXTRA_ENTRIES: ChatbotEntry[] = [
  {
    id: "pricing",
    question: "Is SwingTradingLog free?",
    answer:
      "Yes — full access is free during beta with no credit card required. Dashboard, journal, goals, analytics, CSV export, and workspace backup are included.",
    keywords: [
      "price",
      "pricing",
      "cost",
      "free",
      "beta",
      "credit card",
      "paid",
      "subscription",
      "forever",
    ],
    links: [{ label: "Start free", href: "/login" }],
  },
  {
    id: "get-started",
    question: "How do I get started?",
    answer:
      "Click Start free or Sign In, create an account with email or Google, then log your first swing trade with entry, stop, and target. The dashboard updates as you close positions.",
    keywords: [
      "start",
      "sign up",
      "signup",
      "register",
      "begin",
      "create account",
      "get started",
      "login",
      "log in",
    ],
    links: [
      { label: "Sign in", href: "/login" },
      { label: "Swing trading guides", href: "/trading-guides" },
    ],
  },
  {
    id: "features",
    question: "What features are included?",
    answer:
      "Dashboard analytics (P&L, profit factor, win rate, equity curve), overnight/weekend exposure, swing trade journal, goals, risk settings, shareable trade cards for closed trades, CSV export, and JSON backup.",
    keywords: [
      "feature",
      "features",
      "include",
      "dashboard",
      "analytics",
      "journal",
      "goals",
    ],
    links: [{ label: "View homepage features", href: "/#features" }],
  },
  {
    id: "risk-calculator",
    question: "Do you have a risk calculator?",
    answer:
      "Yes. Use the free position-size and risk calculator on the marketing site to plan R-multiples before you enter a swing trade.",
    keywords: ["risk", "calculator", "position size", "position-size", "r:r", "rr"],
    links: [{ label: "Open risk calculator", href: "/risk-calculator" }],
  },
  {
    id: "blog",
    question: "Where can I read swing trading tips?",
    answer:
      "Visit the blog for articles on starting a swing journal, overnight gap risk, and weekly trade reviews — all written for multi-day traders.",
    keywords: ["blog", "article", "articles", "tips", "guide", "learn"],
    links: [{ label: "Read the blog", href: "/blog" }],
  },
  {
    id: "support",
    question: "How do I contact support?",
    answer:
      "Signed-in users can send feedback from the in-app Feedback page. For account or privacy questions, review our Terms and Privacy Policy in the footer.",
    keywords: ["support", "help", "contact", "feedback", "email"],
    links: [
      { label: "Privacy policy", href: "/privacy" },
      { label: "Terms of service", href: "/terms" },
    ],
  },
];

function keywordsFromQuestion(question: string): string[] {
  const normalized = question.toLowerCase();
  const words = normalized
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2);
  return [normalized, ...words];
}

const FAQ_ENTRIES: ChatbotEntry[] = LANDING_FAQS.map((faq, index) => ({
  id: `faq-${index}`,
  question: faq.question,
  answer: faq.answer,
  keywords: keywordsFromQuestion(faq.question),
  links:
    faq.question === "Where are Privacy and Terms?"
      ? [
          { label: "Privacy policy", href: "/privacy" },
          { label: "Terms of service", href: "/terms" },
        ]
      : faq.question === "Is there a mobile app?"
        ? [{ label: "Sign in on desktop", href: "/login" }]
        : faq.question === "Can I import or export my trades?"
          ? [{ label: "Sign in to export", href: "/login" }]
          : undefined,
}));

export const CHATBOT_ENTRIES: ChatbotEntry[] = [...EXTRA_ENTRIES, ...FAQ_ENTRIES];

export const CHATBOT_QUICK_QUESTIONS = [
  "Is SwingTradingLog free?",
  "How do I get started?",
  "What features are included?",
  "Which assets can I journal?",
  "How does overnight and weekend exposure work?",
  "Can I share trades publicly?",
];

function normalizeInput(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function findChatbotEntryByQuestion(question: string): ChatbotEntry | undefined {
  const normalized = normalizeInput(question);
  return CHATBOT_ENTRIES.find(
    (entry) => normalizeInput(entry.question) === normalized
  );
}

export function matchChatbotReply(input: string): ChatbotEntry | null {
  const normalized = normalizeInput(input);
  if (!normalized) return null;

  const exact = findChatbotEntryByQuestion(input);
  if (exact) return exact;

  let best: ChatbotEntry | null = null;
  let bestScore = 0;

  for (const entry of CHATBOT_ENTRIES) {
    let score = 0;

    for (const keyword of entry.keywords) {
      const keywordNormalized = normalizeInput(keyword);
      if (!keywordNormalized) continue;

      if (normalized === keywordNormalized) {
        score += 8;
      } else if (
        normalized.includes(keywordNormalized) ||
        keywordNormalized.includes(normalized)
      ) {
        score += keywordNormalized.length >= 8 ? 5 : 3;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }

  return bestScore >= 3 ? best : null;
}
