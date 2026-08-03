import fs from "node:fs/promises";
import path from "node:path";

const NSE_EQUITY_CSV_URL =
  "https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv";
const OUTPUT_PATH = path.join(
  process.cwd(),
  "public/data/nse-equity-symbols.json"
);

function parseNseEquityCsv(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const symbols = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const comma = line.indexOf(",");
    if (comma <= 0) continue;

    const code = line.slice(0, comma).trim().toUpperCase();
    const rest = line.slice(comma + 1);
    const nextComma = rest.indexOf(",");
    const name = (nextComma >= 0 ? rest.slice(0, nextComma) : rest)
      .trim()
      .replace(/^"|"$/g, "");

    if (code && name) symbols.push({ c: code, n: name });
  }

  return symbols;
}

async function main() {
  const res = await fetch(NSE_EQUITY_CSV_URL, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; SwingTradingLog/1.0)",
      Accept: "text/csv,*/*",
    },
  });

  if (!res.ok) {
    throw new Error(`NSE CSV request failed: ${res.status}`);
  }

  const symbols = parseNseEquityCsv(await res.text());
  if (symbols.length === 0) {
    throw new Error("NSE CSV returned no symbols");
  }

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(symbols));

  console.log(`Updated ${symbols.length} NSE symbols at ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
