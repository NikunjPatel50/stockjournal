import Link from "next/link";
import Image from "next/image";
import type { BlogBlock } from "@/lib/blog-posts";

function BlogBlockView({ block }: { block: BlogBlock }) {
  switch (block.type) {
    case "h2":
      return (
        <h2 className="mt-10 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          {block.text}
        </h2>
      );
    case "h3":
      return (
        <h3 className="mt-8 text-lg font-semibold text-foreground">
          {block.text}
        </h3>
      );
    case "ul":
      return (
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground sm:text-base">
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    case "image":
      return (
        <figure className="mt-8 overflow-hidden rounded-2xl border border-border bg-muted/30">
          <Image
            src={block.src}
            alt={block.alt}
            width={1200}
            height={675}
            className="h-auto w-full object-cover"
            sizes="(max-width: 768px) 100vw, 768px"
          />
          {block.caption ? (
            <figcaption className="px-4 py-3 text-center text-xs text-muted-foreground sm:text-sm">
              {block.caption}
            </figcaption>
          ) : null}
        </figure>
      );
    case "p":
    default:
      return (
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          {block.text}
        </p>
      );
  }
}

export function BlogArticleBody({ blocks }: { blocks: BlogBlock[] }) {
  return (
    <div className="prose-blog">
      {blocks.map((block, index) => (
        <BlogBlockView key={index} block={block} />
      ))}
      <p className="mt-10 rounded-xl border border-border bg-muted/40 p-5 text-sm leading-relaxed text-muted-foreground">
        Ready to log your swings?{" "}
        <Link
          href="/login"
          className="font-medium text-emerald-600 underline-offset-2 hover:underline dark:text-emerald-400"
        >
          Start free on SwingTradingLog
        </Link>
        , or explore{" "}
        <Link
          href="/trading-guides"
          className="font-medium text-emerald-600 underline-offset-2 hover:underline dark:text-emerald-400"
        >
          trading guides
        </Link>{" "}
        and the{" "}
        <Link
          href="/risk-calculator"
          className="font-medium text-emerald-600 underline-offset-2 hover:underline dark:text-emerald-400"
        >
          risk calculator
        </Link>
        .
      </p>
    </div>
  );
}
