import {
  absoluteUrl,
  getSiteUrl,
  SITE_NAME,
} from "@/lib/site";
import { JsonLd } from "@/components/seo/json-ld";

/** Brand + site graph for search engines (homepage and marketing). */
export function SiteJsonLd() {
  const url = getSiteUrl();
  const schema = {
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
          "Free trading journal with dashboard analytics, overnight gap exposure tracking, goals, and shareable trade cards.",
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
          "Free trading journal with dashboard analytics, overnight gap exposure tracking, goals, and shareable trade cards.",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        isPartOf: { "@id": `${url}/#website` },
      },
    ],
  };

  return <JsonLd data={schema} />;
}
