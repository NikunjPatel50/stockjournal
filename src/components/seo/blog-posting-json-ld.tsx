import { JsonLd } from "@/components/seo/json-ld";
import { absoluteUrl } from "@/lib/site";
import type { BlogFaqItem, BlogPost } from "@/lib/blog-posts";

export function BlogPostingJsonLd({ post }: { post: BlogPost }) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    image: absoluteUrl(post.coverImage.src),
    author: {
      "@type": "Organization",
      name: "SwingTradingLog",
      url: absoluteUrl("/"),
    },
    publisher: {
      "@type": "Organization",
      name: "SwingTradingLog",
      url: absoluteUrl("/"),
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl("/logo.png"),
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": absoluteUrl(`/blog/${post.slug}`),
    },
    keywords: post.seo?.keywords?.join(", "),
    articleSection: post.tags[0],
    wordCount: post.readMinutes * 200,
  };

  return <JsonLd data={schema} />;
}

export function BlogFaqJsonLd({ faqs }: { faqs: BlogFaqItem[] }) {
  if (faqs.length === 0) return null;

  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
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
