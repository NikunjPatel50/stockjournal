import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE_URL = process.env.CAPTURE_BASE_URL ?? "http://localhost:3000";
const OUTPUT_DIR = path.join(process.cwd(), "public", "landing");

/** Wider viewport so KPI cards and sidebar content aren't truncated horizontally. */
const CAPTURE_WIDTH = 1600;
const CAPTURE_HEIGHT = 820;

const VARIANTS = ["dashboard", "journal", "analytics", "calendar"];

/** Capture crisp 2x screenshots from the live app preview shell. */
async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  try {
    for (const variant of VARIANTS) {
      const page = await browser.newPage({
        viewport: { width: CAPTURE_WIDTH, height: CAPTURE_HEIGHT },
        deviceScaleFactor: 2,
      });

      await page.emulateMedia({ colorScheme: "dark" });
      await page.goto(`${BASE_URL}/landing-capture/${variant}`, {
        waitUntil: "networkidle",
        timeout: 90_000,
      });
      await page.waitForSelector("#capture-root");
      // Allow market indices and chart data to settle before capture.
      await page.waitForTimeout(4000);

      const outputPath = path.join(OUTPUT_DIR, `app-${variant}.png`);
      await page.locator("#capture-root").screenshot({
        path: outputPath,
        type: "png",
      });

      await page.close();
      console.log(`Captured ${variant} -> ${outputPath}`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
