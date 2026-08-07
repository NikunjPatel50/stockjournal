import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

/** Block private app surfaces; marketing pages stay crawlable. */
const DISALLOW = [
  "/api/",
  "/login",
  "/admin",
  "/dashboard",
  "/journal",
  "/goals",
  "/settings",
  "/analytics",
  "/calendar",
  "/feedback",
];

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: DISALLOW,
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
