// Captures the README screenshots from a running stack seeded with demo data.
//   E2E_CHANNEL=msedge APP_URL=http://localhost:3000 DEMO_EMAIL=... DEMO_PASSWORD=... node scripts/screenshots.mjs
// Read-only: it only signs in and navigates (nothing here triggers an AI call).
import { chromium } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = process.env.APP_URL ?? "http://localhost:3000";
const email = process.env.DEMO_EMAIL;
const password = process.env.DEMO_PASSWORD;
if (!email || !password) throw new Error("Set DEMO_EMAIL and DEMO_PASSWORD");
const out = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "docs", "screenshots");

const browser = await chromium.launch({ channel: process.env.E2E_CHANNEL || undefined });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();

await page.goto(`${app}/login`);
await page.getByPlaceholder("you@example.com").fill(email);
await page.locator("#login-password").fill(password);
await page.getByRole("button", { name: /sign in|log in/i }).click();
await page.waitForURL(/\/dashboard/, { timeout: 60_000 });

async function setTheme(theme) {
  // The account's saved theme wins over localStorage, so use the real toggle (touches the demo account only).
  const isDark = () => page.evaluate(() => document.documentElement.classList.contains("dark"));
  if ((await isDark()) !== (theme === "dark")) {
    await page.getByRole("button", { name: "Toggle theme" }).click();
    await page.waitForTimeout(600);
  }
}

async function shot(route, name, theme = "dark") {
  await page.goto(`${app}${route}`, { waitUntil: "networkidle" });
  const dismiss = page.getByRole("button", { name: /dismiss|close/i }).first();
  if (await dismiss.isVisible().catch(() => false)) await dismiss.click();
  await setTheme(theme);
  await page.waitForTimeout(1200); // let charts finish animating
  await page.screenshot({ path: path.join(out, `${name}.png`) });
  console.log("saved", name);
}

await shot("/dashboard", "dashboard");
await shot("/habits", "habits");
await shot("/health", "area-health");
await shot("/goals", "goals");
await shot("/dashboard", "dashboard-light", "light");
await browser.close();
