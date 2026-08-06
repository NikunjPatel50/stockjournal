import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { format, parseISO } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { LandingFooter } from "@/components/landing/footer";
import { LandingNavbar } from "@/components/landing/navbar";
import { BlogArticleBody } from "@/components/marketing/blog-article-body";
import { MarketingBreadcrumbs } from "@/components/marketing/marketing-breadcrumbs";
import { Button } from "@/components/ui/button";
import {
  BlogFaqJsonLd,
  BlogPostingJsonLd,
} from "@/components/seo/blog-posting-json-ld";
import { getAllBlogSlugs, getBlogPost } from "@/lib/blog-posts";
import { getBlogPostMetadata } from "@/lib/seo-pages";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getAllBlogSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return {};

  return getBlogPostMetadata(post);
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const published = format(parseISO(post.publishedAt), "MMMM d, yyyy");

  const faqs =
    post.faqs ??
    post.blocks
      .filter((block) => block.type === "faq")
      .flatMap((block) => (block.type === "faq" ? block.items : []));

  return (
    <>
      <BlogPostingJsonLd post={post} />
      {faqs.length > 0 ? <BlogFaqJsonLd faqs={faqs} /> : null}
      <LandingNavbar />
      <MarketingBreadcrumbs
        items={[
          { name: "Blog", path: "/blog" },
          { name: post.title, path: `/blog/${post.slug}` },
        ]}
      />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          All posts
        </Link>

        <header className="mt-6 border-b border-border pb-8">
          <div className="overflow-hidden rounded-2xl border border-border">
            <Image
              src={post.coverImage.src}
              alt={post.coverImage.alt}
              width={1200}
              height={675}
              className="h-auto w-full object-cover"
              priority
              sizes="(max-width: 768px) 100vw, 768px"
            />
          </div>
          {post.coverImage.credit ? (
            <p className="mt-2 text-right text-[11px] text-muted-foreground">
              {post.coverImage.credit}
            </p>
          ) : null}
          <div className="mt-6 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <time dateTime={post.publishedAt}>{published}</time>
            <span aria-hidden>·</span>
            <span>{post.readMinutes} min read</span>
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {post.title}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            {post.description}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        </header>

        <BlogArticleBody blocks={post.blocks} />

        <div className="mt-12 flex flex-col items-start gap-3 border-t border-border pt-8 sm:flex-row">
          <Link href="/login">
            <Button className="bg-emerald-500 text-zinc-950 hover:bg-emerald-400">
              Start journaling free
            </Button>
          </Link>
          <Link href="/blog">
            <Button variant="outline">More articles</Button>
          </Link>
        </div>
      </main>
      <LandingFooter />
    </>
  );
}
