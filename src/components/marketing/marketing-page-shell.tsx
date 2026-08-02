import { LandingFooter } from "@/components/landing/footer";
import { LandingNavbar } from "@/components/landing/navbar";
import { MarketingBreadcrumbs } from "@/components/marketing/marketing-breadcrumbs";
import type { BreadcrumbItem } from "@/components/seo/breadcrumb-json-ld";

export function MarketingPageShell({
  children,
  breadcrumbs,
}: {
  children: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
}) {
  return (
    <>
      <LandingNavbar />
      {breadcrumbs ? <MarketingBreadcrumbs items={breadcrumbs} /> : null}
      <main>{children}</main>
      <LandingFooter />
    </>
  );
}
