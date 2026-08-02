import type { Metadata } from "next";
import { SEO_PAGES } from "@/lib/seo-pages";

export const SITE_NAME = "SwingTradingLog";

export const HOME_TITLE = SEO_PAGES.home.title;

export const DEFAULT_DESCRIPTION = SEO_PAGES.home.description;

export function getSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "https://swingtradinglog.com"
  );
}

/** Canonical path without trailing slash (except `/`). */
export function canonicalPath(path: string) {
  if (!path || path === "/") return "/";
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return normalized.replace(/\/+$/, "") || "/";
}

export function absoluteUrl(path: string) {
  const base = getSiteUrl();
  const p = canonicalPath(path);
  return p === "/" ? base : `${base}${p}`;
}

const OG_IMAGE_PATH = "/og-image.webp";

export function openGraphImages() {
  const url = absoluteUrl(OG_IMAGE_PATH);
  return [
    {
      url,
      width: 1200,
      height: 630,
      alt: "SwingTradingLog trading journal dashboard preview",
    },
  ];
}

export function buildPageMetadata({
  title,
  description = DEFAULT_DESCRIPTION,
  path,
  keywords,
  openGraphTitle,
  absoluteTitle = false,
  noIndex = false,
  image,
}: {
  title: string;
  description?: string;
  path: string;
  keywords?: string[];
  openGraphTitle?: string;
  absoluteTitle?: boolean;
  noIndex?: boolean;
  image?: string;
}): Metadata {
  const url = absoluteUrl(path);
  const ogTitle = openGraphTitle ?? title;
  const resolvedTitle = absoluteTitle ? { absolute: title } : title;
  const ogImages = image
    ? [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: ogTitle,
        },
      ]
    : openGraphImages();

  return {
    title: resolvedTitle,
    description,
    ...(keywords?.length ? { keywords } : {}),
    alternates: {
      canonical: url,
    },
    ...(noIndex
      ? {
          robots: {
            index: false,
            follow: true,
            googleBot: { index: false, follow: true },
          },
        }
      : {}),
    openGraph: {
      type: "website",
      url,
      siteName: SITE_NAME,
      title: ogTitle,
      description,
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: [image ?? absoluteUrl(OG_IMAGE_PATH)],
    },
  };
}
