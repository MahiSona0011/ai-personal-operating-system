import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests. They need the API and its database running (CI: docker-compose.e2e.yml) and a
 * production build of the frontend. Environment:
 *   E2E_BASE_URL   where the frontend is served        (default http://localhost:3000)
 *   E2E_API_URL    the API, as the tests reach it       (default http://localhost:8000/api/v1)
 *   E2E_MAIL_PORT  the mail sink the API sends to       (default 4010)
 *   E2E_CHANNEL    a locally installed browser, e.g. msedge; unset to use Playwright's chromium
 */
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const port = new URL(baseURL).port || "3000";

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./e2e/.results",
  globalSetup: "./e2e/global-setup.ts",
  // Every test registers its own user, so tests don't share state and could run in parallel;
  // one worker keeps the small CI database and the single mail sink predictable.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [["list"], ["html", { open: "never", outputFolder: "e2e/.report" }]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], channel: process.env.E2E_CHANNEL || undefined },
    },
  ],
  webServer: {
    command: `npx next start -p ${port}`,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
