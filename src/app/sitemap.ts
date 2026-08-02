import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

const PUBLIC_ROUTES = [
  { path: "/", changeFrequency: "weekly" as const, priority: 1 },
  { path: "/changelog", changeFrequency: "monthly" as const, priority: 0.4 },
  { path: "/blog", changeFrequency: "weekly" as const, priority: 0.5 },
  { path: "/trading-guides", changeFrequency: "monthly" as const, priority: 0.5 },
  { path: "/risk-calculator", changeFrequency: "monthly" as const, priority: 0.4 },
  { path: "/privacy", changeFrequency: "yearly" as const, priority: 0.3 },
  { path: "/terms", changeFrequency: "yearly" as const, priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return PUBLIC_ROUTES.map(({ path, changeFrequency, priority }) => ({
    url: absoluteUrl(path),
    lastModified: now,
    changeFrequency,
    priority,
  }));
}
