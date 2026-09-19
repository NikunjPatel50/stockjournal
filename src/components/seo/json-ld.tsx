function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

function jsonLdScriptId(data: Record<string, unknown>, id?: string): string {
  if (id) return id;
  const raw = serializeJsonLd(data);
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash * 31 + raw.charCodeAt(i)) >>> 0;
  }
  return `json-ld-${hash.toString(36)}`;
}

/** JSON-LD as a native script — not next/script, which hydrates and warns in React 19. */
export function JsonLd({
  data,
  id,
}: {
  data: Record<string, unknown>;
  id?: string;
}) {
  return (
    <script
      id={jsonLdScriptId(data, id)}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}

export { serializeJsonLd };
