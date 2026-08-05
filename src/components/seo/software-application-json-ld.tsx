import { absoluteUrl, DEFAULT_DESCRIPTION, SITE_NAME } from "@/lib/site";
import { JsonLd } from "@/components/seo/json-ld";

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

  return <JsonLd data={schema} />;
}
