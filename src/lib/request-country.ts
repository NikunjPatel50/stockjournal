import { headers } from "next/headers";
import { cache } from "react";

const PRIVATE_IP =
  /^(::1|localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.|fc00:|fe80:)/i;

function firstPublicIp(value: string | null) {
  if (!value) return null;
  for (const part of value.split(",")) {
    const ip = part.trim();
    if (ip && !PRIVATE_IP.test(ip)) return ip;
  }
  return null;
}

function countryFromHeaders(h: Headers) {
  const candidates = [
    h.get("x-vercel-ip-country"),
    h.get("cf-ipcountry"),
    h.get("cloudfront-viewer-country"),
    h.get("x-country-code"),
    process.env.GEO_COUNTRY_OVERRIDE,
  ];

  for (const value of candidates) {
    const code = value?.trim().toUpperCase();
    if (code && code.length === 2 && code !== "XX" && code !== "T1") {
      return code;
    }
  }

  return null;
}

async function lookupCountryByIp(ip: string | null) {
  const url = ip
    ? `https://ipwho.is/${encodeURIComponent(ip)}`
    : "https://ipwho.is/";

  try {
    const response = await fetch(url, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(2500),
    });
    if (!response.ok) return null;

    const data = (await response.json()) as {
      success?: boolean;
      country_code?: string;
    };

    if (!data.success || !data.country_code) return null;
    return data.country_code.trim().toUpperCase();
  } catch {
    return null;
  }
}

/** Resolve visitor country (ISO alpha-2) from edge headers or IP lookup. */
export const getRequestCountry = cache(async (): Promise<string | null> => {
  const h = await headers();
  const fromHeader = countryFromHeaders(h);
  if (fromHeader) return fromHeader;

  const ip =
    firstPublicIp(h.get("x-forwarded-for")) ??
    firstPublicIp(h.get("x-real-ip"));

  return lookupCountryByIp(ip);
});
