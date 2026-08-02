import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { format, parseISO } from "date-fns";
import { ArrowRight } from "lucide-react";
import { LandingFooter } from "@/components/landing/footer";
import { LandingNavbar } from "@/components/landing/navbar";
import { MarketingBreadcrumbs } from "@/components/marketing/marketing-breadcrumbs";
import { Button } from "@/components/ui/button";
import { BLOG_POSTS } from "@/lib/blog-posts";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Swing Trading Blog | Tips & Strategies | SwingTradingLog",
  description:
    "Swing trading journal tips, performance reviews, and strategy notes. Free insights from SwingTradingLog — start tracking trades today.",
  path: "/blog",
  absoluteTitle: true,
});

export default function BlogPage() {
  const posts = [...BLOG_POSTS].sort(
    (a, b) => parseISO(b.publishedAt).getTime() - parseISO(a.publishedAt).getTime()
  );

  return (
    <>
      <LandingNavbar />
      <MarketingBreadcrumbs items={[{ name: "Blog", path: "/blog" }]} />
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        <header className="text-center">
          <p className="text-sm font-medium text-emerald-500">Blog</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Swing Trading Insights &amp; Strategies
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Practical articles on journaling, overnight gap risk, and weekly
            reviews for multi-day traders.
          </p>
        </header>

        <ul className="mt-12 space-y-8">
          {posts.map((post) => (
            <li key={post.slug}>
              <article className="group overflow-hidden rounded-2xl border border-border bg-card/60 transition-colors hover:border-emerald-500/40">
                <div className="grid gap-0 sm:grid-cols-[280px_1fr]">
                  <Link
                    href={`/blog/${post.slug}`}
                    className="relative block aspect-[16/10] overflow-hidden sm:aspect-auto sm:min-h-[200px]"
                  >
                    <Image
                      src={post.coverImage.src}
                      alt={post.coverImage.alt}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      sizes="(max-width: 640px) 100vw, 280px"
                    />
                  </Link>
                  <div className="p-6">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <time dateTime={post.publishedAt}>
                    {format(parseISO(post.publishedAt), "MMM d, yyyy")}
                  </time>
                  <span aria-hidden>·</span>
                  <span>{post.readMinutes} min read</span>
                </div>
                <h2 className="mt-2 text-lg font-semibold text-foreground sm:text-xl">
                  <Link
                    href={`/blog/${post.slug}`}
                    className="hover:text-emerald-600 dark:hover:text-emerald-400"
                  >
                    {post.title}
                  </Link>
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {post.description}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <Link
                  href={`/blog/${post.slug}`}
                  className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-emerald-600 dark:text-emerald-400"
                >
                  Read article
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                  </div>
                </div>
              </article>
            </li>
          ))}
        </ul>

        <div className="mt-12 text-center">
          <Link href="/login">
            <Button className="bg-emerald-500 text-zinc-950 hover:bg-emerald-400">
              Start free — no credit card
            </Button>
          </Link>
        </div>
      </main>
      <LandingFooter />
    </>
  );
}
