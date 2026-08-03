type RssItem = {
  title: string;
  link?: string;
  pubDate?: string;
  description?: string;
  source?: string;
};

function decodeXmlEntities(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function readTag(block: string, tag: string): string | undefined {
  const cdata = block.match(
    new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, "i")
  );
  if (cdata?.[1] != null) return decodeXmlEntities(cdata[1]);

  const plain = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i"));
  if (plain?.[1] != null) return decodeXmlEntities(plain[1]);

  return undefined;
}

function readSource(block: string): string | undefined {
  const source = block.match(/<source[^>]*>([\s\S]*?)<\/source>/i);
  if (source?.[1]) return decodeXmlEntities(source[1]);
  return undefined;
}

export function parseRssItems(xml: string): RssItem[] {
  const items: RssItem[] = [];
  const matches = xml.matchAll(/<item>([\s\S]*?)<\/item>/gi);

  for (const match of matches) {
    const block = match[1];
    const title = readTag(block, "title");
    if (!title) continue;

    items.push({
      title,
      link: readTag(block, "link"),
      pubDate: readTag(block, "pubDate"),
      description: readTag(block, "description"),
      source: readSource(block),
    });
  }

  return items;
}

export function parseRssDate(value: string | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function stripHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function sourceFromUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}
