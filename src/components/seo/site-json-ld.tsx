import {
  absoluteUrl,
  DEFAULT_DESCRIPTION,
  getSiteUrl,
  SITE_NAME,
} from "@/lib/site";

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
        description: DEFAULT_DESCRIPTION,
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
        description: DEFAULT_DESCRIPTION,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        isPartOf: { "@id": `${url}/#website` },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
