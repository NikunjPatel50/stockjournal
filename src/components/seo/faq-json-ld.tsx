import { LANDING_FAQS } from "@/lib/faq-content";
import { JsonLd } from "@/components/seo/json-ld";

export function FaqJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: LANDING_FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return <JsonLd data={schema} />;
}
