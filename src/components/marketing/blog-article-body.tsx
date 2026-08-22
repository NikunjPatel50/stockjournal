import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import type { BlogBlock } from "@/lib/blog-posts";

const INTERNAL_LINK_RE =
  /(\/(?:blog\/[a-z0-9-]+|risk-calculator|trading-guides|features|pricing|preview|faq))/gi;

const linkClassName =
  "font-medium text-emerald-600 underline-offset-2 hover:underline dark:text-emerald-400";

function internalLinkLabel(path: string) {
  if (path.startsWith("/blog/")) {
    return path
      .slice("/blog/".length)
      .replace(/-/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }
  return path.slice(1).replace(/-/g, " ");
}

function linkifyInternalPaths(text: string): ReactNode {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(INTERNAL_LINK_RE)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      nodes.push(text.slice(lastIndex, index));
    }
    const path = match[0];
    nodes.push(
      <Link key={`${path}-${index}`} href={path} className={linkClassName}>
        {internalLinkLabel(path)}
      </Link>
    );
    lastIndex = index + path.length;
  }

  if (nodes.length === 0) return text;
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

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
            <li key={item}>{linkifyInternalPaths(item)}</li>
          ))}
        </ul>
      );
    case "checklist":
      return (
        <div className="mt-6 rounded-xl border border-border bg-muted/30 p-4 sm:p-5">
          {block.title ? (
            <p className="mb-3 text-sm font-semibold text-foreground sm:text-base">
              {block.title}
            </p>
          ) : null}
          <ul className="space-y-2.5">
            {block.items.map((item) => (
              <li
                key={item}
                className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground sm:text-base"
              >
                <span
                  className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border border-emerald-500/40 bg-emerald-500/10 text-[10px] text-emerald-600 dark:text-emerald-400"
                  aria-hidden
                >
                  ✓
                </span>
                <span>{linkifyInternalPaths(item)}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    case "table":
      return (
        <figure className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {block.headers.map((header) => (
                  <th
                    key={header}
                    className="px-3 py-2.5 font-semibold text-foreground sm:px-4"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="border-b border-border/70 even:bg-muted/20"
                >
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className="px-3 py-2.5 text-muted-foreground sm:px-4"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {block.caption ? (
            <figcaption className="mt-2 text-xs text-muted-foreground sm:text-sm">
              {block.caption}
            </figcaption>
          ) : null}
        </figure>
      );
    case "faq":
      return (
        <div className="mt-8 space-y-4">
          {block.items.map((item) => (
            <details
              key={item.question}
              className="group rounded-xl border border-border bg-muted/20 px-4 py-3 open:bg-muted/40"
            >
              <summary className="cursor-pointer list-none text-sm font-semibold text-foreground marker:content-none sm:text-base [&::-webkit-details-marker]:hidden">
                {item.question}
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                {linkifyInternalPaths(item.answer)}
              </p>
            </details>
          ))}
        </div>
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
    case "svg":
      return (
        <figure className="mt-8 overflow-hidden rounded-2xl border border-border bg-[#131722]">
          <div
            className="w-full [&_svg]:block [&_svg]:h-auto [&_svg]:w-full"
            role="img"
            aria-label={block.alt}
            dangerouslySetInnerHTML={{ __html: block.markup }}
          />
          {block.caption ? (
            <figcaption className="border-t border-border/60 bg-muted/30 px-4 py-3 text-center text-xs text-muted-foreground sm:text-sm">
              {block.caption}
            </figcaption>
          ) : null}
        </figure>
      );
    case "p":
    default:
      return (
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          {linkifyInternalPaths(block.text)}
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
