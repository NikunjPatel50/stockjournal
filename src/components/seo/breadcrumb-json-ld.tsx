import { absoluteUrl } from "@/lib/site";
import { JsonLd } from "@/components/seo/json-ld";

export type BreadcrumbItem = {
  name: string;
  path: string;
};

export function BreadcrumbJsonLd({ items }: { items: BreadcrumbItem[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };

  return <JsonLd data={schema} />;
}
