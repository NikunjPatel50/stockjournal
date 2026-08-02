import type { Metadata } from "next";
import type { BlogPost } from "@/lib/blog-posts";
import { absoluteUrl, buildPageMetadata } from "@/lib/site";

export type SeoPageId =
  | "home"
  | "features"
  | "preview"
  | "pricing"
  | "roadmap"
  | "faq"
  | "login"
  | "blog"
  | "tradingGuides"
  | "riskCalculator"
  | "changelog"
  | "privacy"
  | "terms"
  | "dashboard"
  | "journal"
  | "analytics"
  | "goals"
  | "settings"
  | "feedback"
  | "admin"
  | "share";

export type SeoPageConfig = {
  title: string;
  description: string;
  keywords: string[];
  path: string;
  absoluteTitle?: boolean;
  noIndex?: boolean;
};

/** Central SEO copy and keywords — one place per public route. */
export const SEO_PAGES: Record<SeoPageId, SeoPageConfig> = {
  home: {
    path: "/",
    title: "Trading Journal & Trade Log | SwingTradingLog — Free Beta",
    description:
      "Free trading journal at swingtradinglog.com: Dashboard analytics, overnight gap exposure, Journal, Goals, and shareable trade cards — no credit card.",
    keywords: [
      "trading journal",
      "trade log",
      "free trading journal",
      "stock trading journal",
      "trade tracker",
      "P&L tracker",
      "equity curve",
      "trade analytics",
      "overnight gap risk",
      "shareable trade cards",
      "SwingTradingLog",
    ],
    absoluteTitle: true,
  },
  features: {
    path: "/features",
    title: "Trading Journal Features | Dashboard, Journal & Goals | SwingTradingLog",
    description:
      "Explore SwingTradingLog features: dashboard analytics, overnight gap exposure, trade journal, goals, shareable trade cards, and data export — free during beta.",
    keywords: [
      "trading journal features",
      "trade log app",
      "dashboard analytics",
      "overnight gap risk",
      "trade journal",
      "shareable trade cards",
      "SwingTradingLog",
    ],
    absoluteTitle: true,
  },
  preview: {
    path: "/preview",
    title: "Trading Analytics Preview | Dashboard & Charts | SwingTradingLog",
    description:
      "Preview SwingTradingLog dashboards, journal, equity curve, weekly P&L, and goals — the same screens you get after a free sign-up.",
    keywords: [
      "trading analytics",
      "equity curve",
      "weekly P&L",
      "trading dashboard preview",
      "journal preview",
      "SwingTradingLog demo",
    ],
    absoluteTitle: true,
  },
  pricing: {
    path: "/pricing",
    title: "Pricing | Free Trading Journal | SwingTradingLog",
    description:
      "SwingTradingLog is free during beta — full dashboard, journal, goals, analytics, CSV export, and workspace backup. No credit card required.",
    keywords: [
      "free trading journal",
      "trading journal pricing",
      "free trade log",
      "no credit card",
      "SwingTradingLog pricing",
    ],
    absoluteTitle: true,
  },
  roadmap: {
    path: "/roadmap",
    title: "Product Roadmap | SwingTradingLog",
    description:
      "See what’s shipped in SwingTradingLog beta and what we’re building next: live quotes, risk calculator, mobile apps, and broker integrations.",
    keywords: [
      "SwingTradingLog roadmap",
      "product roadmap",
      "trading journal updates",
      "upcoming features",
    ],
    absoluteTitle: true,
  },
  faq: {
    path: "/faq",
    title: "FAQ | SwingTradingLog Trading Journal",
    description:
      "Answers about SwingTradingLog: free beta access, journaling assets, exports, overnight exposure, sharing trades, and mobile support.",
    keywords: [
      "trading journal FAQ",
      "SwingTradingLog help",
      "journal questions",
      "free trading journal",
    ],
    absoluteTitle: true,
  },
  login: {
    path: "/login",
    title: "Sign in",
    description:
      "Sign in to your free SwingTradingLog trading journal — track trades, analytics, and goals.",
    keywords: [
      "sign in",
      "login",
      "trading journal login",
      "SwingTradingLog account",
      "free trading journal",
    ],
    noIndex: true,
  },
  blog: {
    path: "/blog",
    title: "Swing Trading Blog | Tips & Strategies | SwingTradingLog",
    description:
      "Swing trading journal tips, performance reviews, and strategy notes. Free insights from SwingTradingLog — start tracking trades today.",
    keywords: [
      "swing trading blog",
      "trading journal tips",
      "trade review",
      "overnight gap risk",
      "swing trading strategies",
      "trading psychology",
      "SwingTradingLog",
    ],
    absoluteTitle: true,
  },
  tradingGuides: {
    path: "/trading-guides",
    title: "Trading Guides for Swing Traders | Free Resources | SwingTradingLog",
    description:
      "Free swing trading guides: journal setup, risk management, and performance review workflows. Practical resources from SwingTradingLog.",
    keywords: [
      "swing trading guides",
      "trading journal setup",
      "risk management",
      "position sizing",
      "trade review workflow",
      "swing trading resources",
      "SwingTradingLog",
    ],
    absoluteTitle: true,
  },
  riskCalculator: {
    path: "/risk-calculator",
    title: "Position Size Calculator | Risk Management Tool | SwingTradingLog",
    description:
      "Free position size calculator for swing traders. Size trades by risk, stop loss, and account size — built into SwingTradingLog.",
    keywords: [
      "position size calculator",
      "risk calculator",
      "stop loss calculator",
      "R multiple",
      "swing trading risk",
      "trade sizing",
      "SwingTradingLog",
    ],
    absoluteTitle: true,
  },
  changelog: {
    path: "/changelog",
    title: "SwingTradingLog Changelog | Latest Updates & Features",
    description:
      "See what's new in SwingTradingLog: journal updates, dashboard analytics, and feature releases for your free trading journal.",
    keywords: [
      "SwingTradingLog changelog",
      "product updates",
      "trading journal features",
      "release notes",
    ],
    absoluteTitle: true,
  },
  privacy: {
    path: "/privacy",
    title: "Privacy Policy",
    description:
      "How SwingTradingLog collects, uses, and protects your account and journal data.",
    keywords: [
      "privacy policy",
      "data protection",
      "trading journal privacy",
      "SwingTradingLog",
    ],
  },
  terms: {
    path: "/terms",
    title: "Terms of Service",
    description:
      "Terms for using the SwingTradingLog trading journal and related services.",
    keywords: [
      "terms of service",
      "user agreement",
      "trading journal terms",
      "SwingTradingLog",
    ],
  },
  dashboard: {
    path: "/dashboard",
    title: "Dashboard",
    description:
      "Trading performance dashboard — KPIs, equity curve, overnight exposure, and P&L.",
    keywords: [
      "trading dashboard",
      "P&L dashboard",
      "equity curve",
      "win rate",
      "profit factor",
      "overnight exposure",
      "SwingTradingLog",
    ],
    noIndex: true,
  },
  journal: {
    path: "/journal",
    title: "Journal",
    description: "Log and review trades in your SwingTradingLog journal.",
    keywords: [
      "trade journal",
      "trade log",
      "log trades",
      "trade notes",
      "trade tags",
      "SwingTradingLog journal",
    ],
    noIndex: true,
  },
  analytics: {
    path: "/analytics",
    title: "Analytics",
    description:
      "Trading analytics — weekly P&L, breakdowns, and trade stats.",
    keywords: [
      "trade analytics",
      "weekly P&L",
      "performance stats",
      "trading reports",
      "SwingTradingLog",
    ],
    noIndex: true,
  },
  goals: {
    path: "/goals",
    title: "Goals",
    description: "Track trading goals and discipline in SwingTradingLog.",
    keywords: [
      "trading goals",
      "discipline tracker",
      "process goals",
      "profit targets",
      "SwingTradingLog",
    ],
    noIndex: true,
  },
  settings: {
    path: "/settings",
    title: "Settings",
    description: "Account, risk, and data settings for your trading journal.",
    keywords: [
      "trading journal settings",
      "risk settings",
      "CSV export",
      "data backup",
      "SwingTradingLog",
    ],
    noIndex: true,
  },
  feedback: {
    path: "/feedback",
    title: "Feedback",
    description: "Suggest features and improvements for SwingTradingLog.",
    keywords: [
      "product feedback",
      "feature request",
      "SwingTradingLog feedback",
    ],
    noIndex: true,
  },
  admin: {
    path: "/admin",
    title: "Admin",
    description: "SwingTradingLog admin panel.",
    keywords: ["admin"],
    noIndex: true,
  },
  share: {
    path: "/share",
    title: "Shared trade",
    description: "Trade shared from SwingTradingLog.",
    keywords: [
      "shared trade",
      "trade card",
      "trade screenshot",
      "SwingTradingLog",
    ],
    noIndex: true,
  },
};

export function getSeoMetadata(
  pageId: SeoPageId,
  overrides?: Partial<SeoPageConfig> & {
    openGraphTitle?: string;
    image?: string;
  }
): Metadata {
  const config = { ...SEO_PAGES[pageId], ...overrides };
  const { openGraphTitle, image, ...page } = config;

  return buildPageMetadata({
    title: page.title,
    description: page.description,
    path: page.path,
    keywords: page.keywords,
    absoluteTitle: page.absoluteTitle,
    noIndex: page.noIndex,
    openGraphTitle,
    image,
  });
}

export function getBlogPostMetadata(post: BlogPost): Metadata {
  const keywords = [
    ...SEO_PAGES.blog.keywords,
    ...post.tags.map((tag) => tag.toLowerCase()),
    "swing trading",
    "trading journal",
  ];

  return buildPageMetadata({
    title: `${post.title} | SwingTradingLog`,
    description: post.description,
    path: `/blog/${post.slug}`,
    keywords: [...new Set(keywords)],
    absoluteTitle: true,
    image: absoluteUrl(post.coverImage.src),
  });
}
