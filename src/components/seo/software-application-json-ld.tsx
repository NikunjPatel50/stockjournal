import { absoluteUrl, DEFAULT_DESCRIPTION, SITE_NAME } from "@/lib/site";

export function SoftwareApplicationJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
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
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
