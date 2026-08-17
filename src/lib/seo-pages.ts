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
  | "calendar"
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
    title: "Free Trading Journal App | Best Online Stock Trading Log | SwingTradingLog",
    description:
      "Free trading journal and trading journal app for stock, day, and swing traders. Better than a trading journal PDF: online analytics, CSV export, gap risk, and dashboard P&L. No credit card.",
    keywords: [
      "trading journal",
      "free trading journal",
      "trading journal free",
      "trading journal pdf",
      "best trading journal",
      "stock trading journal",
      "day trading journal",
      "trading journal app",
      "online trading journal",
      "trading journal book",
      "journal de trading",
      "trading app",
      "SwingTradingLog",
    ],
    absoluteTitle: true,
  },
  features: {
    path: "/features",
    title: "Trading Journal App Features | Charts, Journal & Analytics | SwingTradingLog",
    description:
      "Trading app features for stock trading, option trading, and forex: journal with trading chart screenshots, dashboard analytics, overnight gap exposure, goals, and CSV export — all free.",
    keywords: [
      "trading app",
      "trading journal features",
      "trading chart",
      "stock trading journal",
      "option trading journal",
      "forex trading journal",
      "dashboard analytics",
      "overnight gap risk",
      "online trading tools",
      "SwingTradingLog",
    ],
    absoluteTitle: true,
  },
  preview: {
    path: "/preview",
    title: "Trading Dashboard Preview | Charts & P&L Analytics | SwingTradingLog",
    description:
      "Preview the SwingTradingLog trading app: stock trading dashboard, equity curve, weekly P&L, trading charts, journal, and goals before you sign up free.",
    keywords: [
      "trading app preview",
      "trading chart",
      "trading analytics",
      "stock trading dashboard",
      "equity curve",
      "weekly P&L",
      "online trading journal demo",
      "SwingTradingLog demo",
    ],
    absoluteTitle: true,
  },
  pricing: {
    path: "/pricing",
    title: "Pricing | Free Trading Journal — No Credit Card | SwingTradingLog",
    description:
      "SwingTradingLog is a free trading journal and trading journal app: full dashboard, stock trading journal, day trading logs, analytics, CSV export, and backup. Better than a trading journal PDF template.",
    keywords: [
      "free trading journal",
      "trading journal free",
      "best trading journal",
      "trading journal pdf",
      "trading journal pricing",
      "online trading journal",
      "no credit card",
      "SwingTradingLog pricing",
    ],
    absoluteTitle: true,
  },
  roadmap: {
    path: "/roadmap",
    title: "Product Roadmap | SwingTradingLog",
    description:
      "See what’s shipped in SwingTradingLog and what we’re building next: live quotes, risk calculator, mobile apps, and broker integrations.",
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
    title: "FAQ | Free Trading Journal App & PDF Export | SwingTradingLog",
    description:
      "Trading journal FAQ: free online journal vs PDF templates, best trading journal features, stock and day trading logs, CSV export, and trading journal app support.",
    keywords: [
      "trading journal pdf",
      "best trading journal",
      "free trading journal",
      "trading journal free",
      "stock trading journal",
      "day trading journal",
      "trading journal app",
      "online trading journal",
      "SwingTradingLog help",
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
    title: "Swing Trading Blog | Strategy, Stocks & Day Trading Tips | SwingTradingLog",
    description:
      "Swing trading strategy guides, stocks for swing trading, day trading vs swing, forex and option trading journals, risk management, and weekly review habits. Free articles from SwingTradingLog.",
    keywords: [
      "what is swing trading",
      "swing trading strategy",
      "swing trading stocks",
      "stocks for swing trading",
      "day trading",
      "intraday trading",
      "forex trading",
      "option trading",
      "swing trading blog",
      "trading journal tips",
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
    noIndex: true,
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
    noIndex: true,
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
    noIndex: true,
  },
  privacy: {
    path: "/privacy",
    title: "Privacy Policy | SwingTradingLog",
    description:
      "How SwingTradingLog collects, uses, and protects your account and journal data.",
    keywords: [
      "privacy policy",
      "data protection",
      "trading journal privacy",
      "SwingTradingLog",
    ],
    absoluteTitle: true,
  },
  terms: {
    path: "/terms",
    title: "Terms of Service | SwingTradingLog",
    description:
      "Terms for using the SwingTradingLog trading journal and related services.",
    keywords: [
      "terms of service",
      "user agreement",
      "trading journal terms",
      "SwingTradingLog",
    ],
    absoluteTitle: true,
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
      "Trading analytics: weekly P&L, breakdowns, and trade stats.",
    keywords: [
      "trade analytics",
      "weekly P&L",
      "performance stats",
      "trading reports",
      "SwingTradingLog",
    ],
    noIndex: true,
  },
  calendar: {
    path: "/calendar",
    title: "Calendar",
    description:
      "Monthly and yearly P&L calendar for closed swing trades with weekly summaries.",
    keywords: [
      "trading calendar",
      "P&L calendar",
      "daily trading P&L",
      "swing trading journal",
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
    absoluteTitle: page.absoluteTitle,
    noIndex: page.noIndex,
    openGraphTitle,
    image,
  });
}

export function getBlogPostMetadata(post: BlogPost): Metadata {
  return buildPageMetadata({
    title: post.seo?.metaTitle ?? `${post.title} | SwingTradingLog`,
    description: post.seo?.metaDescription ?? post.description,
    path: `/blog/${post.slug}`,
    absoluteTitle: true,
    image: absoluteUrl(post.coverImage.src),
  });
}
