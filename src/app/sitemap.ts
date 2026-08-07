import type { MetadataRoute } from "next";
import { getAllBlogSlugs } from "@/lib/blog-posts";
import { absoluteUrl } from "@/lib/site";
import { getRouteLastModified } from "@/lib/sitemap-lastmod";

const PUBLIC_ROUTES = [
  { path: "/", changeFrequency: "weekly" as const, priority: 1 },
  { path: "/features", changeFrequency: "monthly" as const, priority: 0.8 },
  { path: "/preview", changeFrequency: "monthly" as const, priority: 0.8 },
  { path: "/pricing", changeFrequency: "monthly" as const, priority: 0.8 },
  { path: "/roadmap", changeFrequency: "monthly" as const, priority: 0.6 },
  { path: "/faq", changeFrequency: "monthly" as const, priority: 0.6 },
  { path: "/changelog", changeFrequency: "monthly" as const, priority: 0.4 },
  { path: "/blog", changeFrequency: "weekly" as const, priority: 0.5 },
  { path: "/trading-guides", changeFrequency: "monthly" as const, priority: 0.5 },
  { path: "/risk-calculator", changeFrequency: "monthly" as const, priority: 0.4 },
  { path: "/privacy", changeFrequency: "yearly" as const, priority: 0.3 },
  { path: "/terms", changeFrequency: "yearly" as const, priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages = PUBLIC_ROUTES.map(({ path, changeFrequency, priority }) => ({
    url: absoluteUrl(path),
    lastModified: getRouteLastModified(path),
    changeFrequency,
    priority,
  }));

  const blogPages = getAllBlogSlugs().map((slug) => ({
    url: absoluteUrl(`/blog/${slug}`),
    lastModified: getRouteLastModified("/blog", slug),
    changeFrequency: "monthly" as const,
    priority: 0.45,
  }));

  return [...staticPages, ...blogPages];
}
