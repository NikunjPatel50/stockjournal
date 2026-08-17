import {
  absoluteUrl,
  getSiteUrl,
  SITE_NAME,
} from "@/lib/site";
import { JsonLd, serializeJsonLd } from "@/components/seo/json-ld";

export function buildSiteJsonLdSchema() {
  const url = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${url}/#organization`,
        name: SITE_NAME,
        url,
        logo: absoluteUrl("/icon-512.png"),
        sameAs: [],
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "customer support",
          email: "nicksofficialindia@gmail.com",
          availableLanguage: ["English"],
        },
      },
      {
        "@type": "WebSite",
        "@id": `${url}/#website`,
        name: SITE_NAME,
        url,
        alternateName: [
          "Swing Trading Log",
          "swingtradinglog",
          "swingtradinglog.com",
        ],
        description:
          "Free online trading journal and trading journal app for stock, day, and swing traders. CSV export, dashboard analytics, gap risk, and shareable trade cards.",
        publisher: { "@id": `${url}/#organization` },
        inLanguage: "en-US",
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${url}/#app`,
        name: SITE_NAME,
        applicationCategory: "FinanceApplication",
        operatingSystem: "Web",
        url: absoluteUrl("/"),
        description:
          "Free online trading journal and trading journal app for stock, day, and swing traders. CSV export, dashboard analytics, gap risk, and shareable trade cards.",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        isPartOf: { "@id": `${url}/#website` },
      },
    ],
  };
}

/** Brand + site graph for search engines (homepage and marketing). */
export function SiteJsonLd() {
  return <JsonLd data={buildSiteJsonLdSchema()} />;
}

export function siteJsonLdScriptHtml() {
  return serializeJsonLd(buildSiteJsonLdSchema());
}
