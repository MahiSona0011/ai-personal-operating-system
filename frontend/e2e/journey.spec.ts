import { expect, test } from "@playwright/test";
import { PASSWORD, uniqueEmail } from "./support/helpers";

test("a new user registers, onboards, checks in, and sees their first Life Score", async ({ page }) => {
  const email = uniqueEmail("journey");

  // Register
  await page.goto("/register");
  await page.getByPlaceholder("Ray Kurzweil").fill("Ada Lovelace");
  await page.getByPlaceholder("you@example.com").fill(email);
  await page.getByPlaceholder("Min 8 chars, 1 uppercase, 1 digit").fill(PASSWORD);
  await page.getByPlaceholder("••••••••").fill(PASSWORD);
  await page.getByRole("button", { name: /create account/i }).click();

  // Onboarding: signed-in users with onboarding pending can't skip it
  await expect(page).toHaveURL(/\/onboarding/);
  await expect(page.getByRole("heading", { name: "Welcome, Ada!" })).toBeVisible();
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/onboarding/);

  await page.getByRole("button", { name: "Let's get started" }).click();
  await page.getByPlaceholder("e.g. Mahi").fill("Ada");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Choose your focus areas" })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByPlaceholder("e.g. Run a 5K by end of month").fill("Run a 5K");
  await page.getByRole("button", { name: "Add goal" }).click();
  await page.getByPlaceholder("e.g. Read for 20 minutes").fill("Read for 20 minutes");
  await page.getByRole("button", { name: "Add habit" }).click();
  await expect(page.getByRole("heading", { name: "You're all set!" })).toBeVisible();

  // A brand-new dashboard teaches rather than shows zeros
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  await expect(page.getByText("Complete a check-in to get your first Life Score.")).toBeVisible();
  await expect(page.getByText("Your trend starts with one check-in")).toBeVisible();
  await expect(page.getByText("Read for 20 minutes")).toBeVisible(); // the habit made during onboarding

  // First check-in: rate every area 8, mood and energy and reflections left as they are
  await page.getByRole("link", { name: "Daily Check-In" }).click();
  await expect(page.getByRole("heading", { name: "Daily Check-In" })).toBeVisible();
  const sliders = page.getByRole("slider");
  await expect(sliders).toHaveCount(6);
  for (let i = 0; i < 6; i++) await sliders.nth(i).fill("8");
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText("How are you feeling today?")).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText("Wins, blockers, and next actions")).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: /complete check-in/i }).click();

  // The dashboard shows the score and a trend of exactly one point
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByLabel("Life Score 8.0 out of 10")).toBeVisible();
  await expect(page.getByLabel("Life score, last 30 days, one value: 8")).toBeVisible();
  await expect(page.getByText("1 of 30 days")).toBeVisible();
  await expect(page.getByText("Check-in streak: 1 day")).toBeVisible();

  // And it is still there after a reload (it came from the server, not from client state)
  await page.reload();
  await expect(page.getByLabel("Life Score 8.0 out of 10")).toBeVisible();
});

test("signed-out visitors are sent to log in and returned to the page they wanted", async ({ page }) => {
  await page.goto("/goals");
  await expect(page).toHaveURL(/\/login\?redirect=%2Fgoals/);
});
