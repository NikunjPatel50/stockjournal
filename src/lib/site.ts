import type { Metadata } from "next";

export const SITE_NAME = "SwingTradingLog";

export const HOME_TITLE =
  "Swing Trading Journal & Trade Log | SwingTradingLog — Free Beta";

export const DEFAULT_DESCRIPTION =
  "Free swing trading journal at swingtradinglog.com: Dashboard analytics, overnight gap exposure, Journal, Goals, and shareable trade cards — no credit card.";

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
      alt: "SwingTradingLog swing trading journal dashboard preview",
    },
  ];
}

export function buildPageMetadata({
  title,
  description = DEFAULT_DESCRIPTION,
  path,
  openGraphTitle,
  absoluteTitle = false,
  noIndex = false,
}: {
  title: string;
  description?: string;
  path: string;
  openGraphTitle?: string;
  absoluteTitle?: boolean;
  noIndex?: boolean;
}): Metadata {
  const url = absoluteUrl(path);
  const ogTitle = openGraphTitle ?? title;
  const resolvedTitle = absoluteTitle ? { absolute: title } : title;

  return {
    title: resolvedTitle,
    description,
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
      images: openGraphImages(),
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: [absoluteUrl(OG_IMAGE_PATH)],
    },
  };
}
