import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

/** Block API crawls only. App routes use `noindex` metadata instead of Disallow
 *  so Google can recrawl and drop URLs that should not appear in search. */
const DISALLOW = ["/api/"];

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
