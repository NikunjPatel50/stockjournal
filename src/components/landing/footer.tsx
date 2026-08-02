import Link from "next/link";
import { BrandLogo, BRAND_NAME } from "@/components/brand-logo";
import { MARKETING_NAV_LINKS } from "@/lib/marketing-nav";
import { cn } from "@/lib/utils";

const columns = [
  {
    title: "Product",
    links: [
      ...MARKETING_NAV_LINKS.filter((link) =>
        ["Features", "Roadmap", "Pricing"].includes(link.label)
      ),
      { label: "Changelog", href: "/changelog" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Blog", href: "/blog" },
      { label: "FAQ", href: "/faq" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
    ],
  },
];

export function LandingFooter() {
  return (
    <footer className="border-t border-border px-4 pt-12 pb-8 sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="sm:col-span-2 lg:col-span-1">
          <Link href="/" className="inline-flex items-center">
            <BrandLogo size="sm" markSize="md" framedMark={false} priority />
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
            Free trading journal at swingtradinglog.com — dashboard
            analytics, overnight gap exposure, goals, and shareable trade cards.{" "}
            <Link
              href="/privacy"
              className="underline-offset-2 hover:underline"
            >
              Privacy
            </Link>
            {" · "}
            <Link href="/terms" className="underline-offset-2 hover:underline">
              Terms
            </Link>
          </p>
          <p className="mt-6 text-xs text-muted-foreground">
            © {new Date().getFullYear()} {BRAND_NAME}. All rights reserved.
          </p>
        </div>

        {columns.map((column) => (
          <div key={column.title}>
            <p className="text-sm font-medium text-foreground">{column.title}</p>
            <ul className="mt-4 space-y-2.5">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className={cn(
                      "text-sm text-muted-foreground transition-colors hover:text-foreground",
                      column.title === "Legal" &&
                        "inline-flex min-h-9 items-center rounded-md px-0 py-1.5 font-medium hover:text-emerald-600 dark:hover:text-emerald-400"
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </footer>
  );
}
