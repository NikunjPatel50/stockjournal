import { execSync } from "node:child_process";
import { BLOG_POSTS } from "@/lib/blog-posts";

/** Map public routes to source files for git-based lastmod. */
const ROUTE_SOURCE_FILES: Record<string, string> = {
  "/": "src/app/(marketing)/page.tsx",
  "/features": "src/app/(marketing)/features/page.tsx",
  "/preview": "src/app/(marketing)/preview/page.tsx",
  "/pricing": "src/app/(marketing)/pricing/page.tsx",
  "/roadmap": "src/app/(marketing)/roadmap/page.tsx",
  "/faq": "src/app/(marketing)/faq/page.tsx",
  "/changelog": "src/app/(marketing)/changelog/page.tsx",
  "/blog": "src/app/(marketing)/blog/page.tsx",
  "/trading-guides": "src/app/(marketing)/trading-guides/page.tsx",
  "/risk-calculator": "src/app/(marketing)/risk-calculator/page.tsx",
  "/privacy": "src/app/(marketing)/privacy/page.tsx",
  "/terms": "src/app/(marketing)/terms/page.tsx",
};

const BLOG_SOURCE_PREFIX = "src/lib/blog-posts";

const gitDateCache = new Map<string, Date | null>();

function gitLastModified(relativePath: string): Date | null {
  if (gitDateCache.has(relativePath)) {
    return gitDateCache.get(relativePath) ?? null;
  }

  try {
    const iso = execSync(`git log -1 --format=%cI -- "${relativePath}"`, {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    const date = iso ? new Date(iso) : null;
    gitDateCache.set(relativePath, date);
    return date;
  } catch {
    gitDateCache.set(relativePath, null);
    return null;
  }
}

const BLOG_SLUG_SOURCE: Record<string, string> = {
  "swingtradinglog-vs-other-trading-journals":
    `${BLOG_SOURCE_PREFIX}/swingtradinglog-vs-other-journals.ts`,
  "risk-reward-ratio-swing-trading-guide":
    `${BLOG_SOURCE_PREFIX}/risk-reward-ratio-swing-trading.ts`,
  "swing-trading-psychology-fomo-revenge-trades":
    `${BLOG_SOURCE_PREFIX}/swing-trading-psychology-journal.ts`,
  "how-to-build-swing-trading-watchlist":
    `${BLOG_SOURCE_PREFIX}/swing-trading-watchlist.ts`,
  "what-is-swing-trading":
    `${BLOG_SOURCE_PREFIX}/what-is-swing-trading.ts`,
  "trading-journal-pdf-vs-free-online-journal":
    `${BLOG_SOURCE_PREFIX}/trading-journal-pdf.ts`,
  "weekly-breakout-swing-trading-strategy":
    `${BLOG_SOURCE_PREFIX}/weekly-breakout-strategy.ts`,
};

function blogPostSourceFile(slug: string): string {
  return BLOG_SLUG_SOURCE[slug] ?? "src/lib/blog-posts.ts";
}

/** Per-route last modified for sitemap.xml (blog uses publishedAt + git when available). */
export function getRouteLastModified(path: string, blogSlug?: string): Date {
  if (blogSlug) {
    const post = BLOG_POSTS.find((entry) => entry.slug === blogSlug);
    const published = post ? new Date(post.publishedAt) : null;
    const source = blogPostSourceFile(blogSlug);
    const git = gitLastModified(source);

    if (published && git) {
      return published > git ? published : git;
    }
    if (git) return git;
    if (published) return published;
  }

  const source = ROUTE_SOURCE_FILES[path];
  if (source) {
    const git = gitLastModified(source);
    if (git) return git;
  }

  return new Date("2026-07-15");
}
