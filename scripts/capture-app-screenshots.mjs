import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE_URL = process.env.CAPTURE_BASE_URL ?? "http://localhost:3000";
const OUTPUT_DIR = path.join(process.cwd(), "public", "landing");
const AUTH_STATE = process.env.PLAYWRIGHT_AUTH_STATE;

/** Full-app screenshots for the marketing landing page (sidebar + page chrome). */
const ROUTES = [
  { name: "dashboard", path: "/dashboard" },
  { name: "journal", path: "/journal" },
  { name: "analytics", path: "/analytics" },
  { name: "calendar", path: "/calendar" },
];

async function captureRoute(route, browser) {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
  });

  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto(`${BASE_URL}${route.path}`, {
    waitUntil: "networkidle",
    timeout: 60_000,
  });

  if (page.url().includes("/login")) {
    throw new Error(
      `Not signed in — open ${BASE_URL}/login in the browser, sign in, then run with PLAYWRIGHT_AUTH_STATE or use a logged-in session.`
    );
  }

  await page.waitForTimeout(1500);

  const outputPath = path.join(OUTPUT_DIR, `${route.name}.png`);
  await page.screenshot({
    path: outputPath,
    type: "png",
    fullPage: false,
  });

  await page.close();
  console.log(`Captured ${route.name} -> ${outputPath}`);
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  try {
    const context = await browser.newContext(
      AUTH_STATE ? { storageState: AUTH_STATE } : undefined
    );

    for (const route of ROUTES) {
      const page = await context.newPage({
        viewport: { width: 1280, height: 800 },
        deviceScaleFactor: 2,
      });
      await page.emulateMedia({ colorScheme: "dark" });
      await page.goto(`${BASE_URL}${route.path}`, {
        waitUntil: "networkidle",
        timeout: 60_000,
      });

      if (page.url().includes("/login")) {
        await page.close();
        throw new Error(
          `Capture aborted at ${route.path}: sign in at ${BASE_URL}/login first, then save storage state:\n` +
            `  npx playwright codegen ${BASE_URL}/login --save-storage=playwright-auth.json\n` +
            `  PLAYWRIGHT_AUTH_STATE=playwright-auth.json node scripts/capture-app-screenshots.mjs`
        );
      }

      await page.waitForTimeout(2000);
      const outputPath = path.join(OUTPUT_DIR, `${route.name}.png`);
      await page.screenshot({ path: outputPath, type: "png", fullPage: false });
      await page.close();
      console.log(`Captured ${route.name} -> ${outputPath}`);
    }

    await context.close();
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
