import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { BreadcrumbJsonLd } from "@/components/seo/breadcrumb-json-ld";
import type { BreadcrumbItem } from "@/components/seo/breadcrumb-json-ld";

export function MarketingBreadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  const trail = [{ name: "Home", path: "/" }, ...items];

  return (
    <>
      <BreadcrumbJsonLd items={trail} />
      <nav
        aria-label="Breadcrumb"
        className="mx-auto max-w-2xl px-4 pt-6 text-sm text-muted-foreground sm:px-6"
      >
        <ol className="flex flex-wrap items-center gap-1">
          {trail.map((item, index) => {
            const isLast = index === trail.length - 1;
            return (
              <li key={item.path} className="flex items-center gap-1">
                {index > 0 ? (
                  <ChevronRight className="size-3.5 shrink-0 opacity-50" aria-hidden />
                ) : null}
                {isLast ? (
                  <span className="font-medium text-foreground">{item.name}</span>
                ) : (
                  <Link
                    href={item.path}
                    className="hover:text-foreground hover:underline"
                  >
                    {item.name}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
