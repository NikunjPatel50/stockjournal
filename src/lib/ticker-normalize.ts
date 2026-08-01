/** Zerodha/Kite and similar Indian broker suffixes (e.g. AVALON-EQ → AVALON). */
const IN_BROKER_SUFFIX =
  /^(.+)-(EQ|BE|BZ|BL|SM|GS|GB|IV|NF|MF|N1|N2|N3|N4|N5|N6|N7|N8|N9)$/i;

const DISPLAY_TICKER_SUFFIX = /\(([A-Z0-9.&-]+)\)\s*$/i;

/** Strip $ prefix and common broker segment suffixes for quote lookup. */
export function normalizeEquityTicker(ticker: string): string {
  const raw = ticker.trim().toUpperCase().replace(/^\$/, "");
  if (!raw) return raw;

  const brokerMatch = raw.match(IN_BROKER_SUFFIX);
  if (brokerMatch) return brokerMatch[1];

  return raw;
}

/** Parse plain ticker or suggestion label "Company Name (TICKER)". */
export function parseTickerInput(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";

  const displayMatch = trimmed.match(DISPLAY_TICKER_SUFFIX);
  if (displayMatch) {
    return normalizeEquityTicker(displayMatch[1]);
  }

  return normalizeEquityTicker(trimmed);
}

export function formatTickerDisplayLabel(name: string, code: string): string {
  return `${name} (${code})`;
}

export function isTickerDisplayLabel(text: string): boolean {
  return DISPLAY_TICKER_SUFFIX.test(text.trim());
}
